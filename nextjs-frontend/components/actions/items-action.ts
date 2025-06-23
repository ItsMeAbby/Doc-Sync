"use server";

import { readItem, deleteItem, createItem } from "@/app/clientService";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { itemSchema } from "@/lib/definitions";

export async function fetchItems() {
  const { data, error } = await readItem();

  if (error) {
    return { message: error };
  }

  return data;
}

export async function removeItem(id: string) {
  const { error } = await deleteItem({
    path: {
      item_id: id,
    },
  });

  if (error) {
    return { message: error };
  }
  revalidatePath("/dashboard");
}

export async function addItem(prevState: {}, formData: FormData) {
  const validatedFields = itemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, description, quantity } = validatedFields.data;

  const input = {
    body: {
      name,
      description,
      quantity,
    },
  };
  
  const { error } = await createItem(input);
  
  if (error) {
    return { message: `${error.detail}` };
  }
  
  redirect(`/dashboard`);
}