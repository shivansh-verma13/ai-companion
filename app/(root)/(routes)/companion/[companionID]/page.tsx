import prismadb from "@/lib/prismadb";
import { CompanionForm } from "./components/companion-form";
import { auth, redirectToSignIn } from "@clerk/nextjs/server";

interface CompanionIdPageProps {
  params: {
    companionID: string;
  };
}

const CompanionIdPage = async ({ params }: CompanionIdPageProps) => {
  const { userId } = await auth();
  // Check Subscription

  if (!userId) {
    return redirectToSignIn();
  }

  const companion = await prismadb.companion.findUnique({
    where: {
      id: params.companionID,
      userId,
    },
  });

  const categories = await prismadb.category.findMany();
  return <CompanionForm initialData={companion} categories={categories} />;
};

export default CompanionIdPage;
