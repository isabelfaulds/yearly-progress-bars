const fallbackImages = [
  "https://generic-fallback-card-images-us-west-1.s3.us-west-1.amazonaws.com/muted-abstract-shapes-gemini-1.jpg",
  "https://generic-fallback-card-images-us-west-1.s3.us-west-1.amazonaws.com/muted-dark-abstract-background-gpt.jpg",
];

function getRandomFallback() {
  return fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
}

function NoteCard({ note }) {
  const imageUrl = note.imageUrl || getRandomFallback();
  return (
    <a
      href={note.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden shadow-lg bg-gray-800 hover:bg-gray-700 transition-colors duration-200
                  flex flex-col cursor-pointer"
    >
      {/* Image container - pb for square and cover */}
      <div className="relative w-full pb-[100%] overflow-hidden">
        <img
          src={imageUrl}
          alt={note.title}
          className="absolute inset-0 w-full h-full"
        />
      </div>
      <div className="p-4 flex-grow flex flex-col justify-between">
        <h3
          className="font-semibold text-lg text-white truncate mb-1"
          title={note.title}
        >
          {note.title}
        </h3>
        {note.description && (
          <p
            className="text-gray-400 text-sm line-clamp-2"
            title={note.description}
          >
            {note.description}
          </p>
        )}
        <span className="text-blue-400 text-xs mt-2 truncate" title={note.url}>
          {new URL(note.url).hostname}
        </span>
      </div>
    </a>
  );
}

export default NoteCard;
