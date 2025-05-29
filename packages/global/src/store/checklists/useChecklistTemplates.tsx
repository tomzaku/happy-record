import { v4 } from 'uuid';
import { useLocalStorage } from '../../hook/useLocalStorage';
const CHECKLIST_TEMPLATE_KEY = 'checklist_template';
const SELECTED_CHECKLISTS_TEMPLATE_KEY = 'selected_checklist_templates';

export type ChecklistTemplate = {
  id: string;
  title: string;
  repeat?: {
    minute: string;
    hour: string;
    dayOfMonth: string;
    month: string;
    dayOfWeek: string;
    startedAt: string;
    completedAt?: string;
  };
  avatar: {
    type: string;
    name: string;
    color?: string;
  };
  createdAt: string;
  // @deprecated use groups instead
  records: string[];
  fieldGroups: {
    id: string;
    title: string;
    fields: string[];
  }[];
};

const common = {
  repeat: {
    minute: '0',
    hour: '8',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
    startedAt: new Date().toISOString(),
  },
  createdAt: new Date().toISOString(),
  records: [],
  fieldGroups: [],
};

const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: v4(),
    title: 'Drink water',
    ...common,
    avatar: {
      type: 'icon',
      name: 'mdi:water',
      color: '#00aaff',
    },
  },
  {
    id: v4(),
    title: 'Drink Orange juice',
    ...common,
    avatar: {
      type: 'icon',
      name: 'noto-v1:tropical-drink',
      color: '#ff9900',
    },
  },
  {
    id: v4(),
    title: 'Take vitamin supplement',
    ...common,
    avatar: {
      type: 'icon',
      name: 'game-icons:medicines',
      color: '#00ff00',
    },
  },
  {
    id: v4(),
    title: 'Eat fruits(banana, seeds) and vegetables',
    ...common,
    avatar: {
      type: 'icon',
      name: 'twemoji:pot-of-food',
      color: '#00aaff',
    },
  },
  {
    id: v4(),
    title: 'Exercise',
    ...common,
    avatar: {
      type: 'icon',
      name: 'healthicons:exercise-yoga-outline',
    },
  },
  {
    id: v4(),
    title: 'Sleep early',
    ...common,
    avatar: {
      type: 'icon',
      name: 'fxemoji:sleeping',
    },
  },
  {
    id: v4(),
    title: 'Drink milk',
    ...common,
    avatar: {
      type: 'icon',
      name: 'icon-park-outline:milk',
      color: '#ff9900',
    },
  },
];
const CHECKLIST_OBJECT = CHECKLIST_TEMPLATES.reduce(
  (acc, checklist) => ({
    ...acc,
    [checklist.id]: checklist,
  }),
  {},
);
export const useChecklistTemplates = () => {
  const [checklistTemplate, setChecklistTemplate] = useLocalStorage<
    Record<string, ChecklistTemplate>
  >(CHECKLIST_TEMPLATE_KEY, CHECKLIST_OBJECT, {
    storeOnMount: true,
  });
  const [selectedChecklistTemplates, setSelectedChecklist] = useLocalStorage<
    string[]
  >(SELECTED_CHECKLISTS_TEMPLATE_KEY, []);

  const addChecklistTemplate = (
    currentChecklistTemplate: Omit<ChecklistTemplate, 'id' | 'createdAt'>,
  ) => {
    const id = v4();
    setChecklistTemplate({
      ...checklistTemplate,
      [id]: {
        ...currentChecklistTemplate,
        id,
        createdAt: new Date().toISOString(),
      },
    });
    updateSelectedChecklistTemplate([...selectedChecklistTemplates, id]);
    return {
      id,
    };
  };

  const updateChecklistTemplate = (
    currentChecklistTemplate: Omit<ChecklistTemplate, 'createdAt'>,
  ) => {
    setChecklistTemplate({
      ...checklistTemplate,
      [currentChecklistTemplate.id]: {
        ...currentChecklistTemplate,
        createdAt:
          checklistTemplate[currentChecklistTemplate.id]?.createdAt ||
          new Date().toISOString(),
      },
    });
  };

  const deleteChecklistTemplate = (id: string) => {
    const newChecklistTemplate = { ...checklistTemplate };
    delete newChecklistTemplate[id];
    setChecklistTemplate(newChecklistTemplate);
    // Also remove from selected templates if it was selected
    if (selectedChecklistTemplates.includes(id)) {
      updateSelectedChecklistTemplate(
        selectedChecklistTemplates.filter(templateId => templateId !== id),
      );
    }
  };

  const updateSelectedChecklistTemplate = (checklistIds: string[] = []) => {
    setSelectedChecklist(checklistIds);
  };

  const getRecommendChecklistTemplates = (): ChecklistTemplate[] => {
    return Object.values(checklistTemplate);
  };

  const getChecklistTemplateIdsByGivingDate = (
    { date }: { date: Date } = { date: new Date() },
  ) => {
    return selectedChecklistTemplates.filter(checklistTemplateId => {
      const currentChecklistTemplate = checklistTemplate[checklistTemplateId];
      return (
        currentChecklistTemplate?.repeat?.dayOfWeek
          .split(',')
          .includes(date.getDay().toString()) ||
        currentChecklistTemplate?.repeat?.dayOfWeek === '*'
      );
    });
  };
  const getChecklistTemplate = (id: string) => {
    return checklistTemplate[id];
  };
  return {
    checklistTemplate,
    getChecklistTemplate,
    addChecklistTemplate,
    updateChecklistTemplate,
    deleteChecklistTemplate,
    selectedChecklistTemplates,
    updateSelectedChecklistTemplate,
    getRecommendChecklistTemplates,
    getChecklistTemplateIdsByGivingDate,
  };
};
