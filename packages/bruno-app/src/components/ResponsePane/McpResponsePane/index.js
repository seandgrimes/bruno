import React from 'react';
import Overlay from '../Overlay';
import Placeholder from '../Placeholder';
import ResponseTime from '../ResponseTime/index';
import ResponseClear from '../ResponseClear';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';
import styled from 'styled-components';

const StyledWrapper = styled.div`
  .response-status {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;

    &.ok {
      color: ${(props) => props.theme.colors.text.green};
    }

    &.error {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .error-message {
    color: ${(props) => props.theme.colors.text.danger};
    font-size: 0.875rem;
    padding: 1rem;
  }

  .tool-result-error {
    color: ${(props) => props.theme.colors.text.danger};
    font-size: 0.75rem;
    padding: 4px 0;
    font-weight: 500;
  }
`;

const McpResponsePane = ({ item, collection }) => {
  const { displayedTheme } = useTheme();
  const response = item.response || {};
  const isLoading = item.requestState === 'sending' || response.statusText === 'CALLING';

  const getResultJson = () => {
    if (!response.result) return '';
    try {
      return JSON.stringify(response.result, null, 2);
    } catch (_) {
      return String(response.result);
    }
  };

  if (isLoading) {
    return (
      <StyledWrapper className="flex flex-col h-full">
        <Overlay item={item} collection={collection} />
      </StyledWrapper>
    );
  }

  if (!response || response.status === 'PENDING') {
    return (
      <StyledWrapper className="flex flex-col h-full">
        <Placeholder />
      </StyledWrapper>
    );
  }

  const resultJson = getResultJson();

  return (
    <StyledWrapper className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 gap-4">
        <div className="flex items-center gap-3">
          <span className={`response-status ${response.isError || response.status === 'ERROR' ? 'error' : 'ok'}`}>
            {response.status}
          </span>
          {response.duration > 0 && (
            <ResponseTime duration={response.duration} />
          )}
        </div>
        <ResponseClear item={item} collection={collection} />
      </div>

      {response.isError && response.error && (
        <div className="error-message px-4">{response.error}</div>
      )}

      {response.result?.isError && (
        <div className="tool-result-error px-4">Tool returned an error</div>
      )}

      {resultJson && (
        <HeightBoundContainer>
          <CodeEditor
            value={resultJson}
            onEdit={() => {}}
            mode="application/json"
            theme={displayedTheme}
            readOnly
          />
        </HeightBoundContainer>
      )}
    </StyledWrapper>
  );
};

export default McpResponsePane;
