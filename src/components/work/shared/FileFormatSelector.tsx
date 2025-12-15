import React, { useId } from 'react';
import { FileFormat } from '../../../services/pdfService';
import './PrintControls.css';

const FILE_FORMAT_OPTIONS: Array<{ value: FileFormat; label: string }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'doc', label: 'DOC' }
];

interface FileFormatSelectorProps {
  value: FileFormat;
  onChange: (nextValue: FileFormat) => void;
  className?: string;
}

const FileFormatSelector: React.FC<FileFormatSelectorProps> = ({
  value,
  onChange,
  className
}) => {
  const groupId = useId();

  return (
    <fieldset
      className={`file-format-selector ${className ?? ''}`.trim()}
      aria-label="파일 형식 선택"
    >
      <legend className="file-format-visually-hidden">파일 형식 선택</legend>
      <div className="file-format-radio-group">
        {FILE_FORMAT_OPTIONS.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          const isSelected = value === option.value;

          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={`file-format-radio ${isSelected ? 'is-selected' : ''}`}
            >
              <input
                id={optionId}
                type="radio"
                name={`${groupId}-file-format`}
                value={option.value}
                checked={isSelected}
                onChange={() => {
                  console.log('📋 FileFormatSelector 변경:', {
                    이전값: value,
                    새값: option.value,
                    타입: typeof option.value,
                    라벨: option.label
                  });
                  onChange(option.value);
                }}
              />
              <span className="file-format-label">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

export default FileFormatSelector;







