'use client';

import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/nord.css";
import { useEffect, useRef } from "react";

interface MilkdownProps {
  defaultValue?: string;
  onChange?: (markdown: string) => void;
}

export default function Milkdown({ defaultValue = "Hello!", onChange }: MilkdownProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const crepe = new Crepe({
      root: editorRef.current, // Target the ref, not an ID
      defaultValue: defaultValue,
    });

    crepeRef.current = crepe;

    crepe.create().then(() => {
      console.log("OTTO Editor Ready");
    });

    return () => {
      if (crepeRef.current) {
        crepeRef.current.destroy();
      }
    };
  }, []);

  return (
    <div 
      ref={editorRef} 
      className="otto-editor-container nodrag nopan min-h-[120px] w-full" // "nodrag" stops the node from moving while editing
    />
  );
}


// 'use client';

// import { Crepe } from "@milkdown/crepe";
// import "@milkdown/crepe/theme/common/style.css";
// // import "@milkdown/crepe/theme/frame.css";
// import "@milkdown/crepe/theme/nord.css";
// import { useEffect } from "react";

// export default function Milkdown({ defaultValue = "Hello!", onChange }: MilkdownProps) {
//     useEffect(() => {
//       const crepe = new Crepe({
//         root: "#milkdown-root",
//         defaultValue: "Hello!",
//       });
  
//       crepe.create().then(() => {
//         console.log("Milkdown is ready!");
//       });
  
//       return () => {
//         crepe.destroy();
//       };
//     }, []);

//     return (
//         <div id="milkdown-root" className="mb-4" />
//     );
// }