const StyledInput = ({ type, value, onChange, placeholder, ...rest }) => {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="
          bg-gray-900
          text-white
          border
          border-gray-600
          rounded-full
          p-3
          mb-2
          md:mb-0
          md:mr-2
          md:w-1/4
          focus:bg-gray-700
          focus:border-blue-500
          focus:ring-1
          focus:ring-blue-500
          transition-colors
          duration-200
          placeholder-gray-400
        "
      {...rest}
    />
  );
};

export default StyledInput;
