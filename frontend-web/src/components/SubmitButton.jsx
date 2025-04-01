import React from "react";

const StyledSubmitButton = ({ children, ...rest }) => {
  return (
    <button
      type="submit"
      className="
        bg-gradient-to-r from-blue-500 to-blue-600
        text-white
        font-medium
        py-3 px-6
        rounded-full
        shadow-lg
        hover:shadow-xl
        hover:from-blue-600 hover:to-blue-700
        active:scale-95
        active:shadow-inner
        transition-all
        duration-200
        focus:outline-none
        focus:ring-2 focus:ring-blue-400
        focus:ring-offset-2 focus:ring-offset-black
      "
      {...rest}
    >
      {children}
    </button>
  );
};

export default StyledSubmitButton;
