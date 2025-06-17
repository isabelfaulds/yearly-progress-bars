import { ChevronDown, ChevronUp } from "lucide-react";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { NumericFormat } from "react-number-format";
import { Button } from "./button";
import { Input } from "./input";

export const NumberInput = forwardRef(
  (
    {
      stepper,
      thousandSeparator,
      placeholder,
      defaultValue,
      min = 0,
      max = Infinity,
      onValueChange,
      fixedDecimalScale = false,
      decimalScale = 0,
      suffix,
      prefix,
      value: controlledValue,
      focus = true,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useState(controlledValue ?? defaultValue);

    const handleIncrement = useCallback(() => {
      setValue((prev) =>
        prev === undefined ? stepper ?? 1 : Math.min(prev + (stepper ?? 1), max)
      );
    }, [stepper, max]);

    const handleDecrement = useCallback(() => {
      setValue((prev) =>
        prev === undefined
          ? -(stepper ?? 1)
          : Math.max(prev - (stepper ?? 1), min)
      );
    }, [stepper, min]);

    useEffect(() => {
      const handleKeyDown = (e) => {
        if (document.activeElement === ref?.current) {
          if (e.key === "ArrowUp") {
            handleIncrement();
          } else if (e.key === "ArrowDown") {
            handleDecrement();
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleIncrement, handleDecrement, ref]);

    useEffect(() => {
      if (controlledValue !== undefined) {
        setValue(controlledValue);
      }
    }, [controlledValue]);

    const handleChange = (values) => {
      const newValue =
        values.floatValue === undefined ? undefined : values.floatValue;
      setValue(newValue);
      if (onValueChange) onValueChange(newValue);
    };

    const handleBlur = () => {
      if (value !== undefined) {
        if (value < min) {
          setValue(min);
          if (ref?.current) ref.current.value = String(min);
        } else if (value > max) {
          setValue(max);
          if (ref?.current) ref.current.value = String(max);
        }
      }
    };

    return (
      <div className="flex items-center focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
        <NumericFormat
          value={value}
          onValueChange={handleChange}
          thousandSeparator={thousandSeparator}
          decimalScale={decimalScale}
          fixedDecimalScale={fixedDecimalScale}
          s
          allowNegative={min < 0}
          valueIsNumericString
          onBlur={handleBlur}
          max={max}
          min={min}
          suffix={suffix}
          prefix={prefix}
          customInput={(inputProps) => (
            <Input
              {...inputProps}
              focus={false}
              className={inputProps.className}
            />
          )}
          placeholder={placeholder}
          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent relative"
          getInputRef={ref}
          {...props}
        />

        <div className="flex flex-col">
          <Button
            aria-label="Increase value"
            className="px-2 h-4.5 
            rounded-l-none rounded-br-none border-input border-l-0 border-b-[0.5px] focus-visible:relative"
            variant="outline"
            onClick={handleIncrement}
            disabled={value === max}
          >
            <ChevronUp size={15} />
          </Button>
          <Button
            aria-label="Decrease value"
            className="px-2 h-4.5 rounded-l-none rounded-tr-none border-input border-l-0 border-t-[0.5px] focus-visible:relative"
            variant="outline"
            onClick={handleDecrement}
            disabled={value === min}
          >
            <ChevronDown size={15} />
          </Button>
        </div>
      </div>
    );
  }
);
