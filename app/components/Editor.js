'use client';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

export default function Editor({ value, onChange }) {
  return (
    <div style={{ color: 'black' }}>
      <CKEditor
        editor={ClassicEditor}
        data={value || ''}
        onChange={(event, editor) => {
          const data = editor.getData();
          onChange(data);
        }}
      />
    </div>
  );
}
