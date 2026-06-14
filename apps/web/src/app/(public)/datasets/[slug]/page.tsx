import type { Metadata } from "next";
import DatasetDetailClient from "./DatasetDetailClient";

const INTERNAL_API = process.env.API_INTERNAL_URL ?? "http://api:8000/api";

type DatasetMeta = {
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
};

async function getDataset(slug: string): Promise<DatasetMeta | null> {
  try {
    const res = await fetch(`${INTERNAL_API}/datasets/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const dataset = await getDataset(slug);

  if (!dataset) {
    return { title: "Dataset" };
  }

  const title = dataset.name;
  const description =
    dataset.description?.slice(0, 160) ??
    `Données ouvertes Burkina Faso · ${dataset.category ?? "FasoData"}`;

  return {
    title,
    description,
    keywords: dataset.tags?.join(", "),
    openGraph: {
      title: `${title} — FasoData`,
      description,
      url: `https://fasodata.bf/datasets/${slug}`,
      siteName: "FasoData",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${title} — FasoData`,
      description,
    },
  };
}

export default function Page() {
  return <DatasetDetailClient />;
}
