import { useEffect } from 'react';
import { mcpResponseReceived } from 'providers/ReduxStore/slices/collections/index';
import { useDispatch } from 'react-redux';
import { isElectron } from 'utils/common/platform';

const useMcpEventListeners = () => {
  const { ipcRenderer } = window;
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isElectron()) {
      return () => {};
    }

    const removeResponseListener = ipcRenderer.on(
      'main:mcp:response',
      (requestId, collectionUid, eventData) => {
        dispatch(
          mcpResponseReceived({
            itemUid: requestId,
            collectionUid,
            result: eventData.result,
            duration: eventData.duration,
            error: null
          })
        );
      }
    );

    const removeErrorListener = ipcRenderer.on(
      'main:mcp:error',
      (requestId, collectionUid, eventData) => {
        dispatch(
          mcpResponseReceived({
            itemUid: requestId,
            collectionUid,
            result: null,
            duration: 0,
            error: eventData.error
          })
        );
      }
    );

    return () => {
      removeResponseListener();
      removeErrorListener();
    };
  }, [isElectron]);
};

export default useMcpEventListeners;
