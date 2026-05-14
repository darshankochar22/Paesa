type MenuCardProps = {
  options: string[];
};

export default function MenuCard({
  options,
}: MenuCardProps) {
  return (
    <div className="absolute top-12 left-0 border rounded shadow-md p-3 w-56 flex flex-col gap-2 bg-white">

      {options.map((option) => (
        <button
          key={option}
          className="text-left px-2 py-1 rounded hover:bg-gray-100"
        >
          {option}
        </button>
      ))}

    </div>
  );
}