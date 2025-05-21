import React from 'react';
import {
	Checklist,
	useChecklist,
	useChecklistTemplates,
} from '@dreamer/global';
import { useParams } from 'react-router-dom';

const DetailTaskPage = () => {
	const { id } = useParams<{ id: string }>();
	const { getAllChecklistWithTemplate, getChecklistDetail } = useChecklist();
	const { checklistTemplate } = useChecklistTemplates();
	const template = checklistTemplate[id || ''];
	const [allChecklists, setAllChecklists] = React.useState<Checklist[]>([]);
	const [currentChecklist, setCurrentChecklist] = React.useState<Checklist>();
	React.useEffect(() => {
		if(!id) {
			return;
		}
		const currentChecklist = getChecklistDetail(id);
		const allChecklists = getAllChecklistWithTemplate(
			currentChecklist.checklistTemplateId,
		);
		setAllChecklists(allChecklists.filter(c => Boolean(c.completedAt)));
		setCurrentChecklist(currentChecklist);
		console.log('allChecklists', allChecklists);
	}, [id]);
	if(!currentChecklist) {
		return;
	}
	return <div>{currentChecklist.title}</div>;
};

export default DetailTaskPage;
