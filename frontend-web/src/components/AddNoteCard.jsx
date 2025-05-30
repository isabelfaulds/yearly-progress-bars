import { PlusIcon } from "@heroicons/react/24/solid";

function AddNoteCard({ onAddClick }) {
  return (
    <button
      className="relative block rounded-lg overflow-hidden shadow-lg bg-gray-700 hover:bg-gray-600 transition-colors duration-200
                 flex flex-col items-center justify-center cursor-pointer p-4
                 "
      onClick={onAddClick}
    >
      <PlusIcon className="w-10" />
      <span className="mt-2 text-gray-300 font-semibold text-lg">Save New</span>
    </button>
  );
}

export default AddNoteCard;
