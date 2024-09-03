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
  };
  avatar: {
    type: string;
    name: string;
    color?: string;
  };
};

const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: v4(),
    title: 'Drink water',
    repeat: {
      minute: '0',
      hour: '8',
      dayOfMonth: '*',
      month: '*',
      dayOfWeek: '*',
    },
    avatar: {
      type: 'icon',
      name: 'mdi:water',
      color: '#00aaff',
    },
  },
  {
    id: v4(),
    title: 'Drink Orange juice',
    repeat: {
      minute: '0',
      hour: '8',
      dayOfMonth: '*',
      month: '*',
      dayOfWeek: '*',
    },
    avatar: {
      type: 'icon',
      name: 'noto-v1:tropical-drink',
      color: '#ff9900',
    },
  },
  {
    id: v4(),
    title: 'Take vitamin supplement',
    repeat: {
      minute: '0',
      hour: '8',
      dayOfMonth: '*',
      month: '*',
      dayOfWeek: '*',
    },
    avatar: {
      type: 'icon',
      name: 'game-icons:medicines',
      color: '#00ff00',
    },
  },
  {
    id: v4(),
    title: 'Eat fruits(banana, seeds) and vegetables',
    repeat: {
      minute: '0',
      hour: '8',
      dayOfMonth: '*',
      month: '*',
      dayOfWeek: '*',
    },
    avatar: {
      type: 'icon',
      name: 'twemoji:pot-of-food',
      color: '#00aaff',
    },
  },
  {
    id: v4(),
    title: 'Exercise',
    repeat: {
      minute: '0',
      hour: '8',
      dayOfMonth: '*',
      month: '*',
      dayOfWeek: '*',
    },
    avatar: {
      type: 'icon',
      name: 'healthicons:exercise-yoga-outline',
    },
  },
  {
    id: v4(),
    title: 'Sleep early',
    repeat: {
      minute: '0',
      hour: '8',
      dayOfMonth: '*',
      month: '*',
      dayOfWeek: '*',
    },
    avatar: {
      type: 'icon',
      name: 'fxemoji:sleeping',
    },
  },
  {
    id: v4(),
    title: 'Drink milk',
    repeat: {
      minute: '0',
      hour: '8',
      dayOfMonth: '*',
      month: '*',
      dayOfWeek: '*',
    },
    avatar: {
      type: 'icon',
      name: 'icon-park-outline:milk',
      color: '#ff9900',
    },
  },
];
const CHECKLIST_OBJECT = CHECKLIST_TEMPLATES.reduce(
  (acc: any, checklist: any) => ({
    ...acc,
    [checklist.id]: checklist,
  }),
  {}
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
    currentChecklistTemplate: Omit<ChecklistTemplate, 'id'>
  ) => {
    const id = v4();
    setChecklistTemplate({
      ...checklistTemplate,
      [id]: {
        ...currentChecklistTemplate,
        id,
      },
    });
    updateSelectedChecklistTemplate([...selectedChecklistTemplates, id]);
    return {
      id,
    };
  };

  const updateSelectedChecklistTemplate = (checklistIds: string[] = []) => {
    setSelectedChecklist(checklistIds);
  };

  const getRecommendChecklistTemplates = (): ChecklistTemplate[] => {
    return Object.values(checklistTemplate);
  };

  const getChecklistTemplateIdsByGivingDate = (
    { date }: { date: Date } = { date: new Date() }
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

  return {
    checklistTemplate,
    addChecklistTemplate,
    selectedChecklistTemplates,
    updateSelectedChecklistTemplate,
    getRecommendChecklistTemplates,
    getChecklistTemplateIdsByGivingDate,
  };
};
