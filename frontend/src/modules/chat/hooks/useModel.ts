import { useState } from 'react';

export const useModel = (initialModel: string = 'gpt-4o-mini') => {
  const [selectedModel, setSelectedModel] = useState(initialModel);

  return { selectedModel, setSelectedModel };
};
