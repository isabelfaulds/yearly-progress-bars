import { useState, useRef, useEffect } from "react";
import {
  Bars2Icon,
  Cog6ToothIcon,
  Bars4Icon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

function NavButton() {
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

  return (
    <div className="relative">
      {showIcons && (
        <div className="flex flex-col items-center nav-menu" ref={menuRef}>
          <button onClick={() => handleNavigation("/")} className="mb-2">
            <Bars4Icon className="w-6 h-6 p-1 text-white rounded-full hover:border-2" />
          </button>
          <button
            onClick={() => handleNavigation("/day-view/settings")}
            className="mb-2"
          >
            <Cog6ToothIcon className="w-6 h-6 p-1 text-white rounded-full hover:border-2" />
          </button>
        </div>
      )}

      <button
        ref={buttonRef}
        onClick={handleClick}
        className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg focus:outline-none hover:border-2 text-white"
      >
        <Bars2Icon className="w-6 h-6 drop-shadow-[0_0_1px_white]" />
      </button>
    </div>
  );
}

export default NavButton;
