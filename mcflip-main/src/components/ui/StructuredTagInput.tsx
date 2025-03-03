// import React, { useState, useEffect } from 'react';
// import { Input } from '~/components/ui/input';
// import { Button } from '~/components/ui/button';
// import { X } from 'lucide-react';

// const StructuredTagInput = ({ selectedItem, onTagsChange, setNewTag }: any) => {
//   // Parse default tags from selectedItem
//   const parseInitialTags = () => {
//     // Create 5 empty tag objects
//     const result = Array(5).fill().map(() => ({ parent: '', child: '' }));
    
//     if (selectedItem?.tags && Array.isArray(selectedItem.tags)) {
//       selectedItem.tags.forEach((tag, index) => {
//         if (typeof tag === 'string' && tag.includes(':')) {
//           const [parent, child] = tag.split(':').map(part => part.trim());
//           if (index < 5) {
//             result[index] = { parent, child };
//           }
//         }
//       });
//     }
    
//     return result;
//   };
  
//   // Initialize tag state with 5 rows
//   const [tagInputs, setTagInputs] = useState(parseInitialTags);
  
//   // Update parent component whenever tags change
//   useEffect(() => {
//     // Convert the objects to final string format
//     const formattedTags = tagInputs
//       .filter(tag => tag.parent && tag.child)
//       .map(tag => `${tag.parent}: ${tag.child}`);
    
//     // Only call onTagsChange if it exists and is a function
//     if (typeof onTagsChange === 'function') {
//       onTagsChange(formattedTags);
//     }
//   }, [tagInputs]);
  
  
//   const handleTagChange = (index, field, value) => {
//     const updatedTags = [...tagInputs];
//     updatedTags[index] = { ...updatedTags[index], [field]: value };
//     setTagInputs(updatedTags);
    
//     // Log the formatted version for debugging
//     const currentFormattedTags = updatedTags
//       .filter(tag => tag.parent && tag.child)
//       .map(tag => `${tag.parent}: ${tag.child}`);
//     setNewTag(currentFormattedTags)
//   };
  
//   // Clear a specific tag row
//   const clearTagRow = (index) => {
//     const updatedTags = [...tagInputs];
//     updatedTags[index] = { parent: '', child: '' };
//     setTagInputs(updatedTags);
//   };

//   return (
//     <div className="space-y-4">
//       {tagInputs.map((tag, index) => (
//         <div key={index} className="flex flex-col items-start gap-2">
//           <label className="block font-medium text-white/60 text-left w-full">
//             Tag {index + 1}:
//           </label>
//           <div className="flex items-center justify-center gap-2 w-full">
//             <Input
//               type="text"
//               id={`tag-${index}-parent`}
//               name={`tag-${index}-parent`}
//               value={tag.parent}
//               onChange={(e) => handleTagChange(index, 'parent', e.target.value)}
//               placeholder={
//                 index === 0
//                   ? "id"
//                   : index === 1
//                   ? "type"
//                   : index === 2
//                   ? "mode"
//                   : index === 3
//                   ? "platform"
//                   : ""
//               }
//               className="w-full"
//             />
//             <Input
//               type="text" 
//               id={`tag-${index}-child`}
//               name={`tag-${index}-child`}
//               value={tag.child}
//               onChange={(e) => handleTagChange(index, 'child', e.target.value)}
//               placeholder="Value"
//               className="w-full"
//             />
//             {(tag.parent || tag.child) && (
//               <Button
//                 type="button"
//                 variant="ghost"
//                 size="icon"
//                 onClick={() => clearTagRow(index)}
//                 className="h-10 w-10"
//               >
//                 <X size={16} />
//               </Button>
//             )}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default StructuredTagInput;




import React, { useState, useEffect } from 'react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { X } from 'lucide-react';

const StructuredTagInput = ({ selectedItem, onTagsChange, setNewTag }: any) => {
  // Initialize tag rows based on the number of tags in selectedItem
  const parseInitialTags = () => {
    if (selectedItem?.tags && Array.isArray(selectedItem.tags) && selectedItem.tags.length > 0) {
      return selectedItem.tags.map((tag) => {
        if (typeof tag === 'string' && tag.includes(':')) {
          const [parent, child] = tag.split(':').map(part => part.trim());
          return { parent, child };
        }
        return { parent: '', child: '' };
      });
    }
    // If no tags exist, start with one empty row
    return [{ parent: '', child: '' }];
  };

  const [tagInputs, setTagInputs] = useState(parseInitialTags);

  // Update parent component whenever tagInputs change
  useEffect(() => {
    const formattedTags = tagInputs
      .filter(tag => tag.parent && tag.child)
      .map(tag => `${tag.parent}: ${tag.child}`);

    if (typeof onTagsChange === 'function') {
      onTagsChange(formattedTags);
    }
  }, [tagInputs]);

  const handleTagChange = (index, field, value) => {
    const updatedTags = [...tagInputs];
    updatedTags[index] = { ...updatedTags[index], [field]: value };
    setTagInputs(updatedTags);

    const currentFormattedTags = updatedTags
      .filter(tag => tag.parent && tag.child)
      .map(tag => `${tag.parent}: ${tag.child}`);
    setNewTag(currentFormattedTags);
  };

  // Remove the entire tag row at the given index
  const removeTagRow = (index) => {
    const updatedTags = tagInputs.filter((_, i) => i !== index);
    setTagInputs(updatedTags);
  };

  // Add a new empty tag row
  const addTagRow = () => {
    setTagInputs([...tagInputs, { parent: '', child: '' }]);
  };

  return (
    <div className="space-y-4">
      {tagInputs.map((tag, index) => (
        <div key={index} className="flex flex-col items-start gap-2">
          <label className="block font-medium text-white/60 text-left w-full">
            Tag {index + 1}:
          </label>
          <div className="flex items-center justify-center gap-2 w-full">
            <Input
              type="text"
              id={`tag-${index}-parent`}
              name={`tag-${index}-parent`}
              value={tag.parent}
              onChange={(e) => handleTagChange(index, 'parent', e.target.value)}
              placeholder={
                index === 0
                  ? "id"
                  : index === 1
                  ? "type"
                  : index === 2
                  ? "mode"
                  : index === 3
                  ? "platform"
                  : ""
              }
              className="w-full"
            />
            <Input
              type="text"
              id={`tag-${index}-child`}
              name={`tag-${index}-child`}
              value={tag.child}
              onChange={(e) => handleTagChange(index, 'child', e.target.value)}
              placeholder="Value"
              className="w-full"
            />
            {(tag.parent || tag.child) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTagRow(index)}
                className="h-10 w-10"
              >
                <X size={16} />
              </Button>
            )}
          </div>
        </div>
      ))}
      <div>
        <Button type="button" onClick={addTagRow}>
          Add Tag Row
        </Button>
      </div>
    </div>
  );
};

export default StructuredTagInput;
