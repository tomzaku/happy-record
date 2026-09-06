import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeaveChallenge } from '@dreamer/global';

/** The leave-challenge confirmation modal + its actual leave call. */
export const useLeaveChallengeFlow = (id: string | undefined, checklistTemplateId: string | undefined) => {
  const { leaveTheChallenge } = useLeaveChallenge();
  const navigate = useNavigate();
  const [leaveModalVisible, setLeaveModalVisible] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  const confirmLeaveChallenge = async () => {
    if (!id || !checklistTemplateId || leaving) return;
    setLeaving(true);
    try {
      await leaveTheChallenge(id, checklistTemplateId);
      navigate('/');
    } finally {
      setLeaving(false);
      setLeaveModalVisible(false);
    }
  };

  return { leaveModalVisible, setLeaveModalVisible, leaving, confirmLeaveChallenge };
};
