import React, { useState, useEffect } from 'react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { X } from 'lucide-react';

const StructuredTagInput = ({ selectedItem, onTagsChange }) => {
  // Parse default tags from selectedItem
  const parseInitialTags = () => {
    // Create 5 empty tag objects
    const result = Array(5).fill().map(() => ({ parent: '', child: '' }));
    
    if (selectedItem?.tags && Array.isArray(selectedItem.tags)) {
      selectedItem.tags.forEach((tag, index) => {
        if (typeof tag === 'string' && tag.includes(':')) {
          const [parent, child] = tag.split(':').map(part => part.trim());
          if (index < 5) {
            result[index] = { parent, child };
          }
        }
      });
    }
    
    return result;
  };
  
  // Initialize tag state with 5 rows
  const [tagInputs, setTagInputs] = useState(parseInitialTags);
  
  // Update parent component whenever tags change
  useEffect(() => {
    if (onTagsChange) {
      // Convert the objects to final string format
      const formattedTags = tagInputs
        .filter(tag => tag.parent && tag.child)
        .map(tag => `${tag.parent}: ${tag.child}`);
      
      onTagsChange(formattedTags);
    }
  }, [tagInputs]);
  
  // Handle input changes – update state as objects, not strings
  const handleTagChange = (index, field, value) => {
    const updatedTags = [...tagInputs];
    updatedTags[index] = { ...updatedTags[index], [field]: value };
    setTagInputs(updatedTags);
  };
  
  // Clear a specific tag row
  const clearTagRow = (index) => {
    const updatedTags = [...tagInputs];
    updatedTags[index] = { parent: '', child: '' };
    setTagInputs(updatedTags);
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
                onClick={() => clearTagRow(index)}
                className="h-10 w-10"
              >
                <X size={16} />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StructuredTagInput;
