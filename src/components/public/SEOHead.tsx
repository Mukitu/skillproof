import React, { useEffect } from 'react';

interface SEOHeadProps {
  pageKey?: string;
  title?: string;
  description?: string;
  defaults?: {
    title: string;
    description: string;
  };
}


export const SEOHead: React.FC<SEOHeadProps> = ({
  pageKey,
  title,
  description,
  defaults,
}) => {
  const finalTitle = title ?? defaults?.title ?? 'SkillProof';
  const finalDescription =
    description ?? defaults?.description ?? 'Skill verification and career development.';

  useEffect(() => {
    document.title = finalTitle;
    setMeta('description', finalDescription);
    setMeta('og:title', finalTitle, true);
    setMeta('og:description', finalDescription, true);
    setMeta('og:type', 'website', true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', finalTitle);
    setMeta('twitter:description', finalDescription);
    
    void pageKey;
  }, [finalTitle, finalDescription, pageKey]);

  return null;
};

function setMeta(name: string, content: string, property = false) {
  if (typeof document === 'undefined') return;
  const attr = property ? 'property' : 'name';
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${name}"]`,
  );
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export default SEOHead;
