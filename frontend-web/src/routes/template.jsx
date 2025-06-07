import NavButton from "../components/NavButton.jsx";
import { useCategories } from "../hooks/useCategories.jsx";

const baseContainerClasses = `
  // scrollable full background display
  w-screen min-h-screen h-auto m-0
  bg-[#000000] bg-cover bg-center
  // global margins
  pt-5 pl-5 pr-5 pb-5 sm:pt-12 sm:pl-20 text-white
  flex flex-col
`;

const Template = () => {
  const { data: categories, isLoading, error } = useCategories();

  if (isLoading) {
    return (
      <div className={baseContainerClasses}>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    console.log("Error - Loading : ", error.message);
    return (
      <div className={baseContainerClasses}>
        <div>Error Loading</div>
      </div>
    );
  }

  return (
    <div className={baseContainerClasses}>
      <div className="flex flex-col">
        <div className="fixed bottom-4 right-4 p-1 rounded-full ">
          <NavButton direction="up" />
        </div>
      </div>
    </div>
  );
};

export default Template;
