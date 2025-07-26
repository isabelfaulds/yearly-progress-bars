import NavButton from "@/components/NavButton.jsx";
import React from "react";
import ReactMarkdown from "react-markdown";
import markdownContent from "./tos.md?raw";

const baseContainerClasses = `
  // scrollable full background display
  w-screen min-h-screen h-auto m-0
  bg-[#000000] bg-cover bg-center
  // global margins
  pt-5 pl-5 pr-5 pb-5 sm:pt-12 sm:pl-20 text-white
  flex flex-col
  pb-20
`;

const TermsService = () => {
  return (
    <div className={baseContainerClasses}>
      <div className="prose text-white text-left">
        <ReactMarkdown
          components={{
            h1: ({ node, ...props }) => (
              <h1 className="text-gray-400 dark:text-blue-300" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-gray-400 dark:text-blue-300" {...props} />
            ),
            a: ({ node, ...props }) => (
              <a
                className="text-blue-200 no-underline hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            ),
          }}
        >
          {markdownContent}
        </ReactMarkdown>
      </div>
      <div className="flex flex-col">
        <div className="fixed bottom-4 right-4 p-1 rounded-full ">
          <NavButton direction="up" />
        </div>
      </div>
    </div>
  );
};

export default TermsService;
