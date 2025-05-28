import { useState, useRef, useEffect } from "react";
import {
  Bars2Icon,
  Bars4Icon,
  CogIcon,
  CalendarDateRangeIcon,
} from "@heroicons/react/24/outline";
import { SunIcon } from "@heroicons/react/24/solid";

import { useNavigate } from "react-router-dom";

function NavButton({ direction = "down" }) {
  const [showIcons, setShowIcons] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const handleClick = () => {
    setShowIcons((prev) => !prev);
  };

  const handleOutsideClick = (event) => {
    if (
      buttonRef.current &&
      !buttonRef.current.contains(event.target) &&
      menuRef.current &&
      !menuRef.current.contains(event.target)
    ) {
      setShowIcons(false);
    }
  };

  const handleNavigation = (path) => {
    setShowIcons(false);
    navigate(path);
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const menuPositionClasses =
    direction === "up" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <div className="relative">
      {/* Nav Button */}
      <button
        ref={buttonRef}
        onClick={handleClick}
        className="bg-gradient-to-tl from-gray-700 to-coolgray flex items-center justify-center w-12 h-12 md:w-15 md:h-15 rounded-full shadow-lg focus:outline-none hover:border-2 text-white"
      >
        <Bars2Icon className="w-6 h-6 drop-shadow-[0_0_1px_white]" />
      </button>

      {/* Menu */}
      {showIcons && (
        <div
          className={`absolute ${menuPositionClasses} left-1/2 -translate-x-1/2 flex flex-col items-center justify-center bg-gradient-to-tl from-coolgray to-gray-900 rounded-full p-2 z-10`}
          ref={menuRef}
        >
          <button onClick={() => handleNavigation("/")} className="mb-2">
            <Bars4Icon className="w-7 h-7 md:w-10 md:h-10 p-1 text-white rounded-full hover:border-2 bg-gray-800" />
          </button>

          <button
            onClick={() => handleNavigation("/day-view/")}
            className="mb-2"
          >
            <SunIcon className="w-7 h-7 md:w-10 md:h-10  p-1 text-white rounded-full hover:border-2 bg-gray-800" />
          </button>
          <button
            onClick={() => handleNavigation("/range-view/")}
            className="mb-2"
          >
            <CalendarDateRangeIcon className="w-7 h-7 md:w-10 md:h-10  p-1 text-white rounded-full hover:border-2 bg-gray-800" />
          </button>
          <button
            onClick={() => handleNavigation("/day-view/settings")}
            className="mb-2"
          >
            <CogIcon className="w-7 h-7 md:w-10 md:h-10 p-1 text-white rounded-full hover:border-2 bg-gray-800" />
          </button>
        </div>
      )}
    </div>
  );
}

export default NavButton;
