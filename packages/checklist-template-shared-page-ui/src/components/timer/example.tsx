import React from 'react';
import Timer from './index';

const TimerExample = () => {
  const handleTimerFinish = () => {
    console.log('Timer finished!');
    alert('Timer completed!');
  };

  const handleCustomTimerFinish = () => {
    console.log('Custom 10-second timer finished!');
    alert('10-second timer completed!');
  };

  return (
    <div
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <h2>Timer Component Examples</h2>

      {/* Default 5-second timer */}
      <div>
        <h3>Default Timer (5 seconds)</h3>
        <Timer onFinish={handleTimerFinish} />
      </div>

      {/* Custom duration timer */}
      <div>
        <h3>Custom Duration Timer (10 seconds)</h3>
        <Timer duration={10000} onFinish={handleCustomTimerFinish} />
      </div>

      {/* Auto-start timer */}
      <div>
        <h3>Auto-start Timer (3 seconds)</h3>
        <Timer
          duration={3000}
          onFinish={() => alert('Auto-start timer finished!')}
          autoStart={true}
        />
      </div>

      {/* Timer without display */}
      <div>
        <h3>Timer without Display (7 seconds)</h3>
        <Timer
          duration={7000}
          onFinish={() => alert('Hidden display timer finished!')}
          showDisplay={false}
        />
      </div>

      {/* Disabled timer */}
      <div>
        <h3>Disabled Timer</h3>
        <Timer
          duration={5000}
          onFinish={() => alert('This should not trigger')}
          disabled={true}
        />
      </div>
    </div>
  );
};

export default TimerExample;
