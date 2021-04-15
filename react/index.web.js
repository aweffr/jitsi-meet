/* global APP */

import React from 'react';
import ReactDOM from 'react-dom';

import {getJitsiMeetTransport} from '../modules/transport';

import {App} from './features/app/components';
import {getLogger} from './features/base/logging/functions';
import {Platform} from './features/base/react';
import {getJitsiMeetGlobalNS} from './features/base/util';
import PrejoinApp from './features/prejoin/components/PrejoinApp';

const logger = getLogger('index.web');
const OS = Platform.OS;

/**
 * Renders the app when the DOM tree has been loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  const now = window.performance.now();

  APP.connectionTimes['document.ready'] = now;
  logger.log('(TIME) document ready:\t', now);
});

window.isJitsiSingleChat = false;
window.jitsiAudioOnlyMode = false;
window.activateAt = -1;

const hideVideoTagsFix = () => {
  let ids = ["videoResolutionLabel", "localVideoContainer", "filmstripRemoteVideos"]
  for (let id of ids) {
    let el = document.getElementById(id)
    if (el && window.isJitsiSingleChat) {
      el.style["display"] = "none";
    }
  }
}

function receiveMessageFromIndex(event) {
  console.log('receiveMessageFromIndex', event);
  if (event.data && event.data["jitsiType"] === "jitsiSingleChat") {
    window.isJitsiSingleChat = true;
    if (!window.closeJitsiSingleChatInv) {
      window.closeJitsiSingleChatInv = setInterval(hideVideoTagsFix, 333);
    }
  }
  if (event.data && event.data["jitsiAudioOnlyMode"]) {
    window.jitsiAudioOnlyMode = event.data["jitsiAudioOnlyMode"];
  }
  if (event.data && event.data["activateAt"]) {
    window.activateAt = event.data["activateAt"];
  }
}

window.addEventListener("message", receiveMessageFromIndex, false);

// Workaround for the issue when returning to a page with the back button and
// the page is loaded from the 'back-forward' cache on iOS which causes nothing
// to be rendered.
if (OS === 'ios') {
  window.addEventListener('pageshow', event => {
    // Detect pages loaded from the 'back-forward' cache
    // (https://webkit.org/blog/516/webkit-page-cache-ii-the-unload-event/)
    if (event.persisted) {
      // Maybe there is a more graceful approach but in the moment of
      // writing nothing else resolves the issue. I tried to execute our
      // DOMContentLoaded handler but it seems that the 'onpageshow' event
      // is triggered only when 'window.location.reload()' code exists.
      window.location.reload();
    }
  });
}

/**
 * Stops collecting the logs and disposing the API when the user closes the
 * page.
 */
window.addEventListener('beforeunload', () => {
  // Stop the LogCollector
  if (APP.logCollectorStarted) {
    APP.logCollector.stop();
    APP.logCollectorStarted = false;
  }
  APP.API.notifyConferenceLeft(APP.conference.roomName);
  APP.API.dispose();
  getJitsiMeetTransport().dispose();
});

const globalNS = getJitsiMeetGlobalNS();

globalNS.entryPoints = {
  APP: App,
  PREJOIN: PrejoinApp
};

globalNS.renderEntryPoint = ({
                               Component,
                               props = {},
                               elementId = 'react'
                             }) => {
  ReactDOM.render(
    <Component {...props} />,
    document.getElementById(elementId)
  );
};
