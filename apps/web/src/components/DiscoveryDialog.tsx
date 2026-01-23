/**
 * Discovery Dialog Component
 * Displays clarification questions to the user during app discovery
 */

import React, { useState, useEffect } from 'react';

export interface DiscoveryQuestion {
  id: string;
  question: string;
  type: 'choice' | 'text' | 'number' | 'boolean';
  options?: string[];
  required: boolean;
  category: string;
  helpText?: string;
}

export interface DiscoveryDialogProps {
  questions: DiscoveryQuestion[];
  onAnswer: (answers: Record<string, unknown>) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const DiscoveryDialog: React.FC<DiscoveryDialogProps> = ({
  questions,
  onAnswer,
  onCancel,
  isLoading = false,
}) => {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Reset answers when questions change
    setAnswers({});
    setErrors({});
  }, [questions]);

  const handleChange = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    // Clear error when user starts typing
    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const validateAnswers = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    for (const question of questions) {
      if (question.required && (answers[question.id] === undefined || answers[question.id] === '' || answers[question.id] === null)) {
        newErrors[question.id] = 'This field is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateAnswers()) {
      onAnswer(answers);
    }
  };


  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Let's build your perfect app</h2>
          <p className="text-sm text-gray-600 mt-1">
            We need a few details to create exactly what you need
          </p>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {questions.map((question) => (
            <div key={question.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {question.question}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {question.helpText && (
                <p className="text-xs text-gray-500">{question.helpText}</p>
              )}

              {/* Render input based on type */}
              {question.type === 'text' && (
                <input
                  type="text"
                  value={(answers[question.id] as string) || ''}
                  onChange={(e) => handleChange(question.id, e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors[question.id] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Type your answer..."
                />
              )}

              {question.type === 'boolean' && (
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === true}
                      onChange={() => handleChange(question.id, true)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === false}
                      onChange={() => handleChange(question.id, false)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-gray-700">No</span>
                  </label>
                </div>
              )}

              {question.type === 'choice' && question.options && (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <label key={option} className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-purple-300 transition-colors">
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={() => handleChange(question.id, option)}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-3 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'number' && (
                <input
                  type="number"
                  value={(answers[question.id] as number) || ''}
                  onChange={(e) => handleChange(question.id, parseInt(e.target.value, 10))}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors[question.id] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter a number..."
                />
              )}

              {errors[question.id] && (
                <p className="text-sm text-red-600">{errors[question.id]}</p>
              )}
            </div>
          ))}
        </div>

        {/* Footer - Mandatory discovery (no skip) */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? 'Processing...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};
