import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Stepper.css';

const CheckIcon = (props) => (
  <svg
    {...props}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}>
    <motion.path
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const variants = {
  enter: (dir) => ({
    x: 0, // ЗМІНЕНО: прибрати зсув
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (dir) => ({
    x: 0, // ЗМІНЕНО: прибрати зсув
    opacity: 0
  })
};

export function Step({ label, children }) {
  return null; // Рендериться через Stepper
}

function StepIndicator({ step, currentStep, label, onClickStep, disableStepIndicators }) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete';

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators) onClickStep?.(step);
  };

  return (
    <div className="step-indicator-wrapper">
      <motion.div
        onClick={handleClick}
        className="step-indicator"
        animate={status}
        initial={false}>
        <motion.div
          variants={{
            inactive: { scale: 1, backgroundColor: '#222', color: '#a3a3a3' },
            active: { scale: 1, backgroundColor: '#5227FF', color: '#5227FF' },
            complete: { scale: 1, backgroundColor: '#5227FF', color: '#3b82f6' }
          }}
          transition={{ duration: 0.3 }}
          className="step-indicator-inner">
          {status === 'complete' ? (
            <CheckIcon className="check-icon" />
          ) : status === 'active' ? (
            <div className="active-dot" />
          ) : (
            <div className="inactive-number">{step + 1}</div>
          )}
        </motion.div>
      </motion.div>
      {label && <div className="step-label">{label}</div>}
    </div>
  );
}

function Stepper({ currentStep, children, onClickStep, disableStepIndicators = false }) {
  const steps = React.Children.toArray(children);
  const [direction, setDirection] = React.useState(0);
  const [prevStep, setPrevStep] = React.useState(currentStep);

  React.useEffect(() => {
    setDirection(currentStep > prevStep ? 1 : -1);
    setPrevStep(currentStep);
  }, [currentStep, prevStep]);

  return (
    <div className="stepper-wrapper">
      <div className="stepper-indicators">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <StepIndicator
              step={index}
              currentStep={currentStep}
              label={step.props.label}
              onClickStep={onClickStep}
              disableStepIndicators={disableStepIndicators}
            />
            {index < steps.length - 1 && (
              <div className="step-connector">
                <motion.div
                  className="step-connector-inner"
                  initial={{ width: '0%' }}
                  animate={{ 
                    width: currentStep > index ? '100%' : '0%',
                    backgroundColor: currentStep > index ? '#5227FF' : '#52525b'
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="stepper-content">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            style={{ width: '100%'}}>
            {steps[currentStep]?.props?.children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Stepper;
