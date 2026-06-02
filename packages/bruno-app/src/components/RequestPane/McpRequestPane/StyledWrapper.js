import styled from 'styled-components';

const StyledWrapper = styled.div`
  .mcp-transport-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    label {
      cursor: pointer;
      font-size: 0.875rem;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid ${(props) => props.theme.requestTabPanel.url.border};

      &.active {
        background-color: ${(props) => props.theme.requestTabPanel.url.bg};
        border-color: ${(props) => props.theme.colors.text.green};
        color: ${(props) => props.theme.colors.text.green};
      }
    }
  }

  .mcp-field-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.75rem;

    label {
      font-size: 0.75rem;
      opacity: 0.7;
      font-weight: 500;
    }

    input, textarea {
      background-color: ${(props) => props.theme.requestTabPanel.url.bg};
      border: ${(props) => props.theme.requestTabPanel.url.border};
      border-radius: ${(props) => props.theme.border.radius.base};
      padding: 4px 8px;
      font-size: 0.875rem;
      outline: none;
      width: 100%;

      &:focus {
        outline: none;
        border-color: ${(props) => props.theme.colors.text.green};
      }
    }
  }
`;

export default StyledWrapper;
