'use strict';

import React from 'react'
import createReactClass from 'create-react-class'
import invariant from 'invariant'
import keyMirror from 'keymirror'
import {
    ReactNativeViewAttributes,
    UIManager,
    EdgeInsetsPropType,
    StyleSheet,
    Text,
    View,
    WebView,
    requireNativeComponent,
    DeviceEventEmitter,
    NativeModules
} from 'react-native'

const WebViewBridgeManager = NativeModules.WebViewBridgeManager;
const resolveAssetSource = require('react-native/Libraries/Image/resolveAssetSource');
const PropTypes = require('prop-types');

const RCT_WEBVIEWBRIDGE_REF = 'webviewbridge';

const WebViewBridgeState = keyMirror({
  IDLE: null,
  LOADING: null,
  ERROR: null,
});

const RCTWebViewBridge = requireNativeComponent('RCTWebViewBridge', WXWebView);

const WXWebView = createReactClass({

  propTypes: {
     ...RCTWebViewBridge.propTypes,

    /**
     * Will be called once the message is being sent from webview
     */
     onMessage: PropTypes.func
  },

  getInitialState: function () {
    return {
      viewState: WebViewBridgeState.IDLE,
      lastErrorEvent: null,
      startInLoadingState: true,
    };
  },


  componentWillMount: function () {
    DeviceEventEmitter.addListener("webViewBridgeMessage", (body) => {
      console.log(body)
      const { onMessage } = this.props;
      const message = body.message;
      if (onMessage) {
          onMessage(message);
      }
    });

    if (this.props.startInLoadingState) {
      this.setState({ viewState: WebViewBridgeState.LOADING });
    }
  },

  render: function () {
    let otherView = null;

    if (this.state.viewState === WebViewBridgeState.LOADING) {
      otherView = this.props.renderLoading && this.props.renderLoading();
    } else if (this.state.viewState === WebViewBridgeState.ERROR) {
      const errorEvent = this.state.lastErrorEvent;
      otherView = this.props.renderError && this.props.renderError(
        errorEvent.domain,
        errorEvent.code,
        errorEvent.description);
    } else if (this.state.viewState !== WebViewBridgeState.IDLE) {
      console.error('RCTWebViewBridge invalid state encountered: ' + this.state.loading);
    }

    const webViewStyles = [styles.container, this.props.style];
    if (this.state.viewState === WebViewBridgeState.LOADING ||
      this.state.viewState === WebViewBridgeState.ERROR) {
      // if we're in either LOADING or ERROR states, don't show the webView
      webViewStyles.push(styles.hidden);
    }

    let { source, ...props } = { ...this.props };

    const webView =
      <RCTWebViewBridge
        ref={RCT_WEBVIEWBRIDGE_REF}
        key="webViewKey"
        {...props}
        source={source}
        style={webViewStyles}
        onLoadingStart={this.onLoadingStart}
        onLoadingFinish={this.onLoadingFinish}
        onLoadingError={this.onLoadingError}
        onMessage={this.onMessage}
      />;

    return (
      <View style={styles.container}>
        {webView}
        {otherView}
      </View>
    );
  },

  onMessage(event) {
    if (this.props.onMessage != null && event.nativeEvent != null) {
      this.props.onMessage(event.nativeEvent.message)
    }
  },

  goForward: function () {
    UIManager.dispatchViewManagerCommand(
      this.getWebViewBridgeHandle(),
      UIManager.RCTWebViewBridge.Commands.goForward,
      null
    );
  },

  goBack: function () {
    UIManager.dispatchViewManagerCommand(
      this.getWebViewBridgeHandle(),
      UIManager.RCTWebViewBridge.Commands.goBack,
      null
    );
  },

  reload: function () {
    UIManager.dispatchViewManagerCommand(
      this.getWebViewBridgeHandle(),
      UIManager.RCTWebViewBridge.Commands.reload,
      null
    );
  },

  loadSource: function (url: string) {
    UIManager.dispatchViewManagerCommand(
      this.getWebViewBridgeHandle(),
      UIManager.RCTWebViewBridge.Commands.loadSource,
      [url]
    );
  },

  sendToBridge: function (message: string) {
    UIManager.dispatchViewManagerCommand(
      this.getWebViewBridgeHandle(),
      UIManager.RCTWebViewBridge.Commands.sendToBridge,
      [message]
    );
  },

  /**
   * We return an event with a bunch of fields including:
   *  url, title, loading, canGoBack, canGoForward
   */
  updateNavigationState: function (event) {
    if (this.props.onNavigationStateChange) {
      this.props.onNavigationStateChange(event.nativeEvent);
    }
  },

  getWebViewBridgeHandle: function () {
    return ReactNative.findNodeHandle(this.refs[RCT_WEBVIEWBRIDGE_REF]);
  },

  onLoadingStart: function (event) {
    const onLoadStart = this.props.onLoadStart;
    onLoadStart && onLoadStart(event);
    this.updateNavigationState(event);
  },

  onLoadingError: function (event) {
    event.persist(); // persist this event because we need to store it
    const { onError, onLoadEnd } = this.props;
    onError && onError(event);
    onLoadEnd && onLoadEnd(event);

    this.setState({
      lastErrorEvent: event.nativeEvent,
      viewState: WebViewBridgeState.ERROR
    });
  },

  onLoadingFinish: function (event) {
    const { onLoad, onLoadEnd } = this.props;
    onLoad && onLoad(event);
    onLoadEnd && onLoadEnd(event);
    this.setState({
      viewState: WebViewBridgeState.IDLE,
    });
    this.updateNavigationState(event);
  },
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hidden: {
    height: 0,
    flex: 0, // disable 'flex:1' when hiding a View
  },
});

export default WXWebView;
