import React from 'react';
import ClassicTemplate from './ClassicTemplate';
import AtsFriendlyTemplate from './AtsFriendlyTemplate';

const TemplateDispatcher = ({ data }) => {
  const templateName = data?.template || 'Classic';
  const atsMode = data?.atsMode;

  if (atsMode || templateName === 'ATS Friendly') {
    return <AtsFriendlyTemplate data={data} />;
  }

  // Classic, Modern, Minimal, Professional share responsive classic/modern layout with custom accent/font
  return <ClassicTemplate data={data} />;
};

export default TemplateDispatcher;
