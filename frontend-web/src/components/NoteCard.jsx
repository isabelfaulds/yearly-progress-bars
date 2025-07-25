import { EllipsisHorizontalIcon } from "@heroicons/react/24/solid";

const fallbackImages = [
  "https://generic-fallback-card-images-us-west-1.s3.us-west-1.amazonaws.com/muted-abstract-shapes-gemini-1.jpg",
  "https://generic-fallback-card-images-us-west-1.s3.us-west-1.amazonaws.com/muted-dark-abstract-background-gpt.jpg",
];

function getRandomFallback() {
  return fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
}

const ensureAbsoluteUrl = (url) => {
  if (!url || typeof url !== "string") {
    return url;
  }
  // Checking http , https etc protocols
  if (/^[a-z]+:\/\//i.test(url)) {
    return url; // Already has a protocol
  }
  // Otherwise, prepending
  return `https://${url}`;
};

function NoteCard({ note, onOptionsClick }) {
  const image = note.image || getRandomFallback();
  const url = ensureAbsoluteUrl(note.url);
  // Get the hostname
  let hostname = new URL(url).hostname;
  // Remove 'www.'
  if (hostname.startsWith("www.")) {
    hostname = hostname.substring(4);
  }

  const handleOptionsClick = (e) => {
    e.stopPropagation(); // Prevent card navigation
    onOptionsClick(note);
  };

  const handleCardClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={handleCardClick}
      className="relative min-h-[275px] h-full rounded-lg overflow-hidden shadow-lg bg-gray-800 hover:bg-gray-700 transition-colors duration-200
                 flex flex-col cursor-pointer"
    >
      {/* ... Edit Button */}
      <EllipsisHorizontalIcon
        onClick={handleOptionsClick}
        className="h-6 w-6 absolute bg-gray-700 rounded-full top-2 right-2 z-10 text-white/70 hover:text-white transition"
      />

      {/* Image container */}
      <div className="relative w-full pb-[100%] overflow-hidden">
        <img
          src={image}
          alt={note.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Text content */}
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
          {hostname}
        </span>
      </div>
    </div>
  );
}

export default NoteCard;
