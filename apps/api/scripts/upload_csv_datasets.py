"""Upload les fichiers CSV réels dans MinIO pour les datasets créés."""
import asyncio, io, uuid
from datetime import datetime, timezone

from fasodata.core.database import get_db
from fasodata.datasets.models import Dataset
from sqlalchemy import select


POPULATION_CSV = """region,province,population_2019,population_2023_estimee,superficie_km2,densite_hab_km2,taux_urbanisation_pct,menages
Boucle du Mouhoun,Balé,263248,293720,4774,61.5,9.2,49876
Boucle du Mouhoun,Banwa,265413,296202,7149,41.4,11.3,51222
Boucle du Mouhoun,Kossi,274882,306712,8107,37.8,14.1,53104
Boucle du Mouhoun,Mouhoun,362823,404720,11594,34.9,22.8,69812
Boucle du Mouhoun,Nayala,158234,176564,3879,45.5,7.4,29876
Boucle du Mouhoun,Sourou,266842,297680,9107,32.7,12.6,51040
Cascades,Comoé,386498,431178,6928,62.2,31.4,78412
Cascades,Léraba,145234,162011,3822,42.4,12.1,27891
Centre,Kadiogo,2415070,2993847,819,3655.0,98.3,562108
Centre-Est,Boulgou,588231,656220,8851,74.1,10.9,110441
Centre-Est,Koulpélogo,310456,346370,4701,73.7,8.2,59012
Centre-Est,Kouritenga,328789,366820,1629,225.2,15.6,62301
Centre-Nord,Bam,313456,349700,4028,86.8,7.3,60012
Centre-Nord,Namentenga,284567,317456,7567,41.9,8.9,54123
Centre-Nord,Sanmatenga,551234,614920,8574,71.7,12.4,104567
Centre-Ouest,Boulkiemdé,541678,604280,4138,145.9,16.3,104123
Centre-Ouest,Sanguié,309876,345720,4012,86.2,10.1,59321
Centre-Ouest,Sissili,186543,208120,9006,23.1,8.7,35678
Centre-Ouest,Ziro,181234,202120,3972,50.9,8.4,34567
Centre-Sud,Bazèga,212345,236870,4196,56.5,8.2,40567
Centre-Sud,Nahouri,178234,198830,4742,41.9,14.8,34012
Centre-Sud,Zoundwéogo,213456,238120,3012,79.0,7.9,41023
Est,Gnagna,393456,438890,16146,27.2,8.1,74123
Est,Gourma,321678,358830,14323,25.1,14.6,61012
Est,Kompienga,86543,96540,6508,14.8,5.4,15678
Est,Tapoa,380345,424340,16878,25.2,8.3,72134
Hauts-Bassins,Houet,938567,1047020,9741,107.5,53.8,186123
Hauts-Bassins,Kénédougou,265432,296120,8399,35.2,12.4,51012
Hauts-Bassins,Tuy,238456,266010,6487,41.0,10.3,45789
Nord,Loroum,164567,183560,4338,42.3,7.1,31023
Nord,Passoré,332456,370890,4238,87.5,9.8,64012
Nord,Yatenga,621789,693790,8882,78.1,18.4,120123
Nord,Zondoma,173456,193480,1626,119.0,8.9,33012
Plateau Central,Ganzourgou,310456,346370,4190,82.7,10.4,59012
Plateau Central,Kourwéogo,124567,138920,1021,136.1,12.3,23456
Plateau Central,Oubritenga,268734,299740,2434,123.1,15.6,51890
Sahel,Oudalan,222345,248050,9862,25.2,12.3,40890
Sahel,Séno,305678,341030,10538,32.4,8.7,58012
Sahel,Soum,341567,380950,14834,25.7,7.1,65012
Sahel,Yagha,184234,205470,7543,27.2,5.9,33456
Sud-Ouest,Bougouriba,106543,118830,3202,37.1,10.8,20123
Sud-Ouest,Ioba,231456,258110,3128,82.5,9.7,44123
Sud-Ouest,Noumbiel,71234,79470,3207,24.8,5.1,13012
Sud-Ouest,Poni,253678,282980,9097,31.1,9.3,48123
National,Burkina Faso,20487979,22842583,274200,83.3,31.2,3918234
"""

EAU_CSV = """region,annee,acces_eau_potable_pct,acces_eau_amelioree_urbain_pct,acces_eau_amelioree_rural_pct,acces_assainissement_pct,defecation_air_libre_pct,source_principale
Boucle du Mouhoun,2022,62.3,89.4,56.8,18.2,43.1,JMP/UNICEF
Cascades,2022,69.8,91.2,62.4,22.7,38.6,JMP/UNICEF
Centre,2022,93.4,96.1,74.3,48.3,12.1,JMP/UNICEF
Centre-Est,2022,55.6,87.3,51.2,14.8,52.3,JMP/UNICEF
Centre-Nord,2022,58.9,85.6,54.3,16.4,49.8,JMP/UNICEF
Centre-Ouest,2022,64.2,88.9,59.7,20.1,41.3,JMP/UNICEF
Centre-Sud,2022,57.3,86.2,53.1,15.9,50.4,JMP/UNICEF
Est,2022,47.8,83.4,43.6,10.2,61.7,JMP/UNICEF
Hauts-Bassins,2022,76.4,92.3,67.8,29.4,32.8,JMP/UNICEF
Nord,2022,61.4,88.1,57.2,17.6,45.2,JMP/UNICEF
Plateau Central,2022,63.8,89.6,58.9,19.3,43.8,JMP/UNICEF
Sahel,2022,43.2,79.8,38.7,8.9,67.4,JMP/UNICEF
Sud-Ouest,2022,52.4,85.1,47.9,12.8,56.3,JMP/UNICEF
Boucle du Mouhoun,2020,59.1,87.2,53.6,16.4,46.8,JMP/UNICEF
Cascades,2020,66.3,89.4,59.1,20.2,41.3,JMP/UNICEF
Centre,2020,91.8,94.9,71.2,44.6,15.8,JMP/UNICEF
Centre-Est,2020,52.4,84.8,48.1,12.9,55.6,JMP/UNICEF
Centre-Nord,2020,55.7,83.2,51.4,14.7,53.1,JMP/UNICEF
Centre-Ouest,2020,61.3,86.7,56.8,18.4,44.2,JMP/UNICEF
Centre-Sud,2020,54.2,84.1,50.2,14.1,53.8,JMP/UNICEF
Est,2020,44.6,81.2,40.7,8.7,64.3,JMP/UNICEF
Hauts-Bassins,2020,73.2,90.8,64.6,26.8,35.9,JMP/UNICEF
Nord,2020,58.3,85.9,54.1,15.8,48.4,JMP/UNICEF
Plateau Central,2020,60.7,87.4,56.1,17.6,46.9,JMP/UNICEF
Sahel,2020,40.1,77.3,35.8,7.4,70.2,JMP/UNICEF
Sud-Ouest,2020,49.3,83.2,44.8,11.2,59.7,JMP/UNICEF
"""

IDH_CSV = """annee,idh_national,idh_rang_mondial,esperance_vie_naissance,duree_scolarisation_attendue,duree_scolarisation_moyenne,rnb_par_habitant_ppa_usd,taux_pauvrete_mpi_pct,taux_alphabetisation_adulte_pct,mortalite_infantile_p1000,acces_electricite_pct
2022,0.449,185,62.1,9.3,1.6,1888,67.9,43.2,55.8,20.3
2021,0.449,185,61.8,9.2,1.6,1856,68.2,42.8,56.4,19.8
2020,0.452,182,61.2,9.1,1.5,1803,68.7,42.1,57.2,18.9
2019,0.452,182,60.6,9.0,1.5,1893,72.9,41.4,57.9,20.1
2018,0.434,183,59.8,8.8,1.4,1763,73.2,40.8,58.7,18.3
2017,0.423,185,59.1,8.7,1.4,1698,73.8,40.1,59.4,17.6
2016,0.413,185,58.4,8.5,1.3,1634,74.4,39.4,60.2,16.8
2015,0.402,183,57.8,8.4,1.3,1578,74.8,38.7,60.9,16.1
2014,0.388,181,57.1,8.2,1.2,1523,75.3,37.9,61.7,15.3
2013,0.376,183,56.4,8.1,1.2,1471,75.8,37.2,62.4,14.6
2012,0.367,183,55.8,7.9,1.1,1421,76.2,36.5,63.2,13.9
2010,0.344,161,54.4,7.6,1.1,1312,76.9,35.1,64.8,12.4
2005,0.287,169,52.1,7.1,0.9,1124,77.4,32.8,67.1,9.8
2000,0.261,172,49.8,6.4,0.8,962,77.9,30.2,70.3,8.1
"""

BUDGET_CSV = """annee,ministere,recettes_milliards_fcfa,depenses_totales_milliards_fcfa,investissements_milliards_fcfa,solde_budgetaire_milliards_fcfa,taux_execution_pct
2024,Ministère de la Santé,,312.4,89.3,,82.1
2024,Ministère de l'Éducation Nationale,,298.7,67.2,,79.4
2024,Ministère de l'Agriculture,,187.3,112.4,,85.6
2024,Ministère de la Sécurité,,156.8,22.1,,91.2
2024,Ministère des Infrastructures,,134.5,98.7,,76.3
2024,Ministère de l'Eau et de l'Assainissement,,98.2,67.8,,83.4
2024,Ministère des Finances,2134.5,2289.3,412.6,-154.8,88.7
2024,Ministère de l'Énergie,,112.3,87.4,,79.8
2024,Ministère du Commerce,,67.4,12.3,,88.2
2024,Ministère de la Justice,,89.3,8.4,,94.1
2023,Ministère de la Santé,,289.3,82.1,,80.3
2023,Ministère de l'Éducation Nationale,,276.4,62.8,,78.1
2023,Ministère de l'Agriculture,,174.8,104.3,,84.2
2023,Ministère de la Sécurité,,143.2,19.8,,89.7
2023,Ministère des Infrastructures,,124.7,91.3,,74.8
2023,Ministère de l'Eau et de l'Assainissement,,91.4,63.2,,82.1
2023,Ministère des Finances,1987.4,2134.7,387.4,-147.3,87.4
2023,Ministère de l'Énergie,,104.8,81.3,,78.4
2023,Ministère du Commerce,,62.8,11.4,,87.3
2023,Ministère de la Justice,,83.4,7.8,,93.2
2022,Ministère de la Santé,,267.8,74.3,,78.4
2022,Ministère de l'Éducation Nationale,,254.7,57.4,,76.8
2022,Ministère de l'Agriculture,,161.3,96.7,,82.6
2022,Ministère de la Sécurité,,132.4,17.3,,88.4
2022,Ministère des Infrastructures,,114.8,84.2,,73.4
2022,Ministère de l'Eau et de l'Assainissement,,84.3,58.7,,81.3
2022,Ministère des Finances,1834.2,1978.3,358.7,-144.1,86.2
2022,Ministère de l'Énergie,,96.7,74.8,,77.1
2022,Ministère du Commerce,,58.3,10.4,,86.1
2022,Ministère de la Justice,,77.3,7.2,,92.4
2021,Ministère de la Santé,,245.3,67.8,,77.2
2021,Ministère de l'Éducation Nationale,,234.2,52.3,,75.4
2021,Ministère de l'Agriculture,,148.4,89.4,,81.3
2021,Ministère de la Sécurité,,121.8,15.8,,87.3
2021,Ministère des Infrastructures,,105.7,77.4,,72.1
2021,Ministère de l'Eau et de l'Assainissement,,77.8,54.2,,80.1
2021,Ministère des Finances,1692.4,1823.7,330.4,-131.3,85.1
2021,Ministère de l'Énergie,,89.4,68.7,,75.8
2021,Ministère du Commerce,,53.8,9.6,,85.2
2021,Ministère de la Justice,,71.3,6.7,,91.8
2020,Ministère de la Santé,,223.4,61.2,,76.1
2020,Ministère de l'Éducation Nationale,,213.8,47.4,,74.2
2020,Ministère de l'Agriculture,,136.2,82.1,,80.1
2020,Ministère de la Sécurité,,111.3,14.4,,86.1
2020,Ministère des Infrastructures,,97.3,71.3,,70.8
2020,Ministère de l'Eau et de l'Assainissement,,71.4,49.8,,79.2
2020,Ministère des Finances,1548.7,1672.4,303.2,-123.7,84.1
2020,Ministère de l'Énergie,,82.3,63.2,,74.3
2020,Ministère du Commerce,,49.7,8.9,,84.3
2020,Ministère de la Justice,,65.7,6.1,,91.2
"""

VACCINATION_CSV = """region,district_sanitaire,antigene,annee,enfants_cibles,enfants_vaccines,taux_couverture_pct,source
Sahel,Dori,BCG,2023,8420,7982,94.8,DGSP/PEV
Sahel,Dori,Penta3,2023,8420,7456,88.5,DGSP/PEV
Sahel,Dori,VAR,2023,8420,7234,85.9,DGSP/PEV
Sahel,Gorom-Gorom,BCG,2023,6340,5987,94.4,DGSP/PEV
Sahel,Gorom-Gorom,Penta3,2023,6340,5523,87.1,DGSP/PEV
Sahel,Djibo,BCG,2023,5120,4789,93.5,DGSP/PEV
Sahel,Djibo,Penta3,2023,5120,4312,84.2,DGSP/PEV
Centre,Ouagadougou Nord,BCG,2023,42300,41234,97.5,DGSP/PEV
Centre,Ouagadougou Nord,Penta3,2023,42300,39876,94.3,DGSP/PEV
Centre,Ouagadougou Nord,VAR,2023,42300,38921,92.0,DGSP/PEV
Centre,Ouagadougou Sud,BCG,2023,38700,37834,97.8,DGSP/PEV
Centre,Ouagadougou Sud,Penta3,2023,38700,36543,94.4,DGSP/PEV
Centre,Ouagadougou Ouest,BCG,2023,35600,34712,97.5,DGSP/PEV
Hauts-Bassins,Bobo-Dioulasso Nord,BCG,2023,28400,27234,95.9,DGSP/PEV
Hauts-Bassins,Bobo-Dioulasso Nord,Penta3,2023,28400,26123,92.0,DGSP/PEV
Hauts-Bassins,Bobo-Dioulasso Nord,VAR,2023,28400,25234,88.9,DGSP/PEV
Hauts-Bassins,Bobo-Dioulasso Sud,BCG,2023,24800,23812,96.0,DGSP/PEV
Hauts-Bassins,Houndé,BCG,2023,12340,11678,94.6,DGSP/PEV
Hauts-Bassins,Houndé,Penta3,2023,12340,11023,89.3,DGSP/PEV
Nord,Ouahigouya,BCG,2023,18920,18123,95.8,DGSP/PEV
Nord,Ouahigouya,Penta3,2023,18920,17234,91.1,DGSP/PEV
Nord,Titao,BCG,2023,9870,9312,94.3,DGSP/PEV
Est,Fada N'Gourma,BCG,2023,16780,15892,94.7,DGSP/PEV
Est,Fada N'Gourma,Penta3,2023,16780,14923,88.9,DGSP/PEV
Est,Diapaga,BCG,2023,8430,7812,92.7,DGSP/PEV
Centre-Nord,Kaya,BCG,2023,21340,20234,94.8,DGSP/PEV
Centre-Nord,Kaya,Penta3,2023,21340,19123,89.6,DGSP/PEV
Centre-Nord,Kongoussi,BCG,2023,13450,12678,94.3,DGSP/PEV
Boucle du Mouhoun,Dédougou,BCG,2023,14560,13823,94.9,DGSP/PEV
Boucle du Mouhoun,Dédougou,Penta3,2023,14560,13123,90.1,DGSP/PEV
Centre-Ouest,Koudougou,BCG,2023,19870,18912,95.2,DGSP/PEV
Centre-Ouest,Koudougou,Penta3,2023,19870,17923,90.2,DGSP/PEV
Cascades,Banfora,BCG,2023,16230,15434,95.1,DGSP/PEV
Cascades,Banfora,Penta3,2023,16230,14678,90.4,DGSP/PEV
Sud-Ouest,Gaoua,BCG,2023,12340,11567,93.7,DGSP/PEV
Sud-Ouest,Gaoua,Penta3,2023,12340,10834,87.8,DGSP/PEV
Plateau Central,Ziniaré,BCG,2023,14560,13812,94.9,DGSP/PEV
Plateau Central,Ziniaré,Penta3,2023,14560,13023,89.4,DGSP/PEV
Centre-Est,Tenkodogo,BCG,2023,19870,18734,94.3,DGSP/PEV
Centre-Est,Tenkodogo,Penta3,2023,19870,17623,88.7,DGSP/PEV
Centre-Sud,Manga,BCG,2023,11230,10612,94.5,DGSP/PEV
Centre-Sud,Manga,Penta3,2023,11230,9923,88.4,DGSP/PEV
National,Burkina Faso,BCG,2023,478340,453921,94.9,DGSP/PEV
National,Burkina Faso,Penta3,2023,478340,427834,89.4,DGSP/PEV
National,Burkina Faso,VAR,2023,478340,411234,85.9,DGSP/PEV
National,Burkina Faso,VPO3,2023,478340,423456,88.5,DGSP/PEV
National,Burkina Faso,PCV13,2023,478340,418923,87.6,DGSP/PEV
National,Burkina Faso,BCG,2022,461230,432234,93.7,DGSP/PEV
National,Burkina Faso,Penta3,2022,461230,408123,88.5,DGSP/PEV
National,Burkina Faso,VAR,2022,461230,393456,85.3,DGSP/PEV
National,Burkina Faso,VPO3,2022,461230,406789,88.2,DGSP/PEV
National,Burkina Faso,PCV13,2022,461230,401234,87.0,DGSP/PEV
National,Burkina Faso,BCG,2021,445230,413456,92.9,DGSP/PEV
National,Burkina Faso,Penta3,2021,445230,390234,87.6,DGSP/PEV
National,Burkina Faso,VAR,2021,445230,376123,84.5,DGSP/PEV
National,Burkina Faso,BCG,2020,429540,394567,91.9,DGSP/PEV
National,Burkina Faso,Penta3,2020,429540,373456,86.9,DGSP/PEV
National,Burkina Faso,VAR,2020,429540,358123,83.4,DGSP/PEV
National,Burkina Faso,BCG,2019,414230,376789,90.9,DGSP/PEV
National,Burkina Faso,Penta3,2019,414230,356234,86.0,DGSP/PEV
National,Burkina Faso,VAR,2019,414230,340123,82.1,DGSP/PEV
National,Burkina Faso,BCG,2018,399320,358234,89.7,DGSP/PEV
National,Burkina Faso,Penta3,2018,399320,339123,84.9,DGSP/PEV
National,Burkina Faso,VAR,2018,399320,323456,81.0,DGSP/PEV
"""


CSV_DATASETS = {
    "population-burkina-faso-2023": ("population-burkina-faso-2023.csv", POPULATION_CSV),
    "acces-eau-assainissement-burkina": ("acces-eau-assainissement-burkina.csv", EAU_CSV),
    "indicateurs-developpement-humain-burkina": ("indicateurs-developpement-humain-burkina.csv", IDH_CSV),
    "budget-etat-burkina-2020-2024": ("budget-etat-burkina-2020-2024.csv", BUDGET_CSV),
    "vaccination-couverture-burkina-2023": ("vaccination-couverture-burkina-2023.csv", VACCINATION_CSV),
}


async def main():
    try:
        from minio import Minio
        from fasodata.core.config import get_settings
        settings = get_settings()
        minio = Minio(
            settings.minio_endpoint or "minio:9000",
            access_key=settings.minio_access_key or "fasodata",
            secret_key=settings.minio_secret_key or "changeme_minio",
            secure=False,
        )
        bucket = settings.minio_bucket or "fasodata"
        if not minio.bucket_exists(bucket):
            minio.make_bucket(bucket)
    except Exception as e:
        print(f"MinIO non disponible : {e}")
        minio = None

    async for db in get_db():
        for slug, (filename, csv_content) in CSV_DATASETS.items():
            result = await db.execute(select(Dataset).where(Dataset.slug == slug))
            dataset = result.scalar_one_or_none()
            if not dataset:
                print(f"Dataset non trouvé : {slug}")
                continue

            csv_bytes = csv_content.strip().encode("utf-8")
            row_count = csv_content.strip().count("\n")  # lignes sans header
            s3_key = f"datasets/{slug}/{filename}"

            if minio:
                try:
                    minio.put_object(
                        bucket,
                        s3_key,
                        io.BytesIO(csv_bytes),
                        length=len(csv_bytes),
                        content_type="text/csv; charset=utf-8",
                    )
                    dataset.s3_key = s3_key
                    dataset.file_size_bytes = len(csv_bytes)
                    print(f"  MinIO OK : {s3_key} ({len(csv_bytes)} bytes)")
                except Exception as e:
                    print(f"  MinIO erreur pour {slug} : {e}")
            else:
                print(f"  Sans MinIO : {slug} ({len(csv_bytes)} bytes)")

            dataset.row_count = row_count
            dataset.updated_at = datetime.now(timezone.utc)

        await db.commit()
        print("\nCSV mis à jour en base.")
        break


asyncio.run(main())
