"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  bootstrapSample,
  changeAsset,
  deleteProject,
  lockProp,
  proposeForElement,
} from "@/lib/orchestrator";
import type { PropOption } from "@/lib/crew/prop-master";

export async function bootstrapAction(): Promise<void> {
  const projectId = await bootstrapSample();
  revalidatePath("/");
  redirect(`/film/${projectId}`);
}

export async function deleteProjectAction(projectId: string): Promise<void> {
  await deleteProject(projectId);
  revalidatePath("/");
  redirect("/");
}

export async function proposeAction(
  projectId: string,
  elementId: string,
): Promise<{ options: PropOption[]; source: string; elementName: string }> {
  const { element, options, source } = await proposeForElement(
    projectId,
    elementId,
  );
  return { options, source, elementName: element.name };
}

export async function lockAction(args: {
  projectId: string;
  elementId: string;
  label: string;
  spec: string;
  params: Record<string, unknown>;
}): Promise<void> {
  await lockProp(args);
  revalidatePath(`/film/${args.projectId}`);
}

export async function changeAction(args: {
  projectId: string;
  assetId: string;
  newLabel?: string;
  newSpec: string;
}): Promise<void> {
  await changeAsset(args);
  revalidatePath(`/film/${args.projectId}`);
}
