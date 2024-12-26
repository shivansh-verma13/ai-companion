import { SearchInput } from "@/components/search-input";
import { Categories } from "@/components/categories";
import { Companions } from "@/components/companions";
import prismadb from "@/lib/prismadb";

interface RootPageProps {
  searchParams: {
    categoryID: string;
    name: string;
  };
}

const RootPage = async ({ searchParams }: RootPageProps) => {
  
  // // Access categoryID and name safely
  // const { categoryID, name } = searchParams;

  const data = await prismadb.companion.findMany({
    where: {
      categoryID: searchParams.categoryID,
      name: {
        search: searchParams.name,
      },
    },
    orderBy: {
      createAt: "desc",
    },
    include: {
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });
  // console.log("data1", data);
  const categories = await prismadb.category.findMany();
  return (
    <div className="h-full p-4 space-y-2">
      <SearchInput />
      <Categories data={categories} />
      <Companions data={data} />
    </div>
  );
};

export default RootPage;
