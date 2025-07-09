import { type FC, useEffect, useState, useRef } from "react";
import { PencilIcon } from "app/components/icons/PencilIcon.js";
import { useStsQueryParams } from "app/hooks/UseStsQueryParams";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  focusOnMount?: boolean;
}

const InstructionInput: FC<Props> = ({ focusOnMount = false, ...rest }) => {
  const { prompt, updatePromptUrlParam } = useStsQueryParams();
  const [text, setText] = useState(prompt);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(text);
  const autofocus = useRef(focusOnMount);

  const handleBlur = () => {
    if (text !== prompt) {
      updatePromptUrlParam(text);
    }
  };

  useEffect(() => {
    if (autofocus.current) {
      inputRef.current?.focus();
    }
  }, [inputRef]);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    return () => {
      updatePromptUrlParam(textRef.current);
    };
  }, [updatePromptUrlParam]);

  return (
    <div {...rest}>
    </div>
  );
};

export default InstructionInput;
