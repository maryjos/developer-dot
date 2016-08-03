import React from 'react';
import RequestParams from './requestParams';
import PostBody from './postBody';

import request from 'request';
import {store} from '../store';
import {actionTypes} from '../reducers/reducer';
import {replacePathParams, hasExampleData, replaceSpacesInStr} from '../helpers';

const handleSubmit = (endpoint, id) => {
    /* If our endpoint has a defined proxy, use that to make our API console request
     * Otherwise, just use the path specified as `host` in Swagger file
     */
    const requestPath = endpoint.proxyRoute || endpoint.path;

    const url = (endpoint.pathParams ? replacePathParams(requestPath, endpoint.pathParams) : requestPath) + (endpoint.qsPath || '');
    const apiReq = {
        url: url,
        headers: {}
    };

    if (requestPath.indexOf('amazonaws') !== -1) {
        apiReq.headers['api-key'] = 'b24757b69083fa34d27a7d814ea3a59c';
    }

    if (endpoint.postBody) {
        apiReq.headers['Content-Type'] = 'application/json';
        apiReq.body = JSON.stringify(endpoint.postBodyData);
    }

    request[endpoint.action](apiReq, (error, response, body) => {
        let responseBody = {};

        try {
            responseBody = JSON.parse(body);
        } catch (err) {
            responseBody.error = err.message;
        }

        store.dispatch({
            type: actionTypes.SUBMIT_DONE,
            endpointId: id,
            apiResponse: {
                body: responseBody,
                status: response ? response.statusCode.toString() : '',
                statusMessage: error ? error.message : response.statusMessage || ''
            }
        });
    });
};

const toggleVisibility = (endpointId) => {
    store.dispatch({
        type: actionTypes.CONSOLE_VISIBILITY_TOGGLED,
        endpointId: endpointId
    });
};

const handleFillSampleData = (id) => {
    store.dispatch({
        type: actionTypes.FILL_REQUEST_SAMPLE_DATA,
        endpointId: id
    });
};

const highlightPunctuation = (str) => {
    return str.replace(/"[^"]*"|([{}\[\],])/g, (m, group1) => {
        if (!group1) {
            return m;
        }

        return '<span class="punctuation">' + m + '</span>';
    });
};

const syntaxHighlight = (jsonObj) => {
    let json = JSON.stringify(jsonObj, null, 2);

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    json = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'number';

        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });

    return highlightPunctuation(json);
};

const ApiConsole = ({endpoint, id}) => (
    <div>
        <div className={'try-it-now-header'} data-target={`#${replaceSpacesInStr(endpoint.name)}-console-body`} data-toggle={'collapse'} id={replaceSpacesInStr(`${endpoint.name}-console`)} onClick={
            () => {
                toggleVisibility(id);
            }
        }>
            {'Try it now! '}
            <span className={'documentation-expand-icon glyphicon glyphicon-menu-down' + (endpoint.apiConsoleVisible ? ' rotate' : '')}></span>
        </div>
        <div className={'collapse'} id={`${replaceSpacesInStr(endpoint.name)}-console-body`}>
            <div className={'row api-console'}>
                <div className={'col-md-4 col-xs-12 api-console-form-wrapper'}>
                    <div style={{marginLeft: '10px'}}>
                            <h3 style={{display: 'inline-block'}}>{'Input'}</h3>
                            {hasExampleData('QUERY_STRING', endpoint.queryString) || hasExampleData('POST_BODY', endpoint.postBody) || hasExampleData('PATH_PARAM', endpoint.pathParams) ?
                            <span
                                className='m-l-1 clickable hdr-btn-adj-text'
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleFillSampleData(id);
                                }}
                            >
                            {' Fill with Sample Data'}
                            </span> : null}
                    </div>
                    <div style={{marginLeft: '10px'}}>
                            <button
                                className='btn btn-primary'
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSubmit(endpoint, id);
                                }}
                                type={'button'}
                            >
                            {'Submit'}
                            </button>
                            <span
                                className='m-l-1 clickable hdr-btn-adj-text'
                                onClick={
                                    () => {
                                        store.dispatch({
                                            type: actionTypes.RESET_CONSOLE,
                                            endpointId: id
                                        });
                                    }
                                }
                                type='reset'>
                            {'Reset'}
                            </span>
                        </div>
                    {endpoint.pathParams ? <RequestParams endpointId={id} paramType={'PATH'} params={endpoint.pathParams}/> : null}
                    {endpoint.queryString ? <RequestParams endpointId={id} paramType={'QUERY_STRING'} params={endpoint.queryString}/> : null}
                    {endpoint.postBody ? <PostBody id={id} name={endpoint.name.toLowerCase() + '_' + endpoint.action} postBody={endpoint.postBody}/> : null}
                    {endpoint.postBody ?
                        <div style={{marginLeft: '10px'}}>
                            <button
                                className='btn btn-primary'
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSubmit(endpoint, id);
                                }}
                                type={'button'}
                            >
                            {'Submit'}
                            </button>
                            <span
                                className='m-l-1 hdr-btn-adj-text clickable'
                                onClick={
                                    () => {
                                        store.dispatch({
                                            type: actionTypes.RESET_CONSOLE,
                                            endpointId: id
                                        });
                                    }
                                }
                                type='reset'>
                                {'Reset'}
                            </span>
                        </div> : null}
                        <div style={{background: 'blue', height: 'auto'}}></div>
                </div>
                <div className={'api-console-output col-md-7 col-xs-12'}>
                    <h5 className={'console-output-header'}>{'API Endpoint'}</h5>
                    <div className={'code-snippet'}>{endpoint.path}</div>
                    <h5 className={'console-output-header'}>{'Method'}</h5>
                    <div className={'code-snippet'}>{endpoint.action.toUpperCase()}</div>
                        {endpoint.PathParams || endpoint.queryString || endpoint.postBody ?
                        <div className={'row'} style={{marginBottom: '8px'}}>
                            <div className={'col-md-6 console-req-container'}>
                                <h5 className={'console-output-header'}>{'Request'}</h5>
                                {/* eslint-disable react/no-danger */}
                                {endpoint.postBody ? <div className={'code-snippet'}><pre dangerouslySetInnerHTML={{__html: endpoint.postBodyData ? syntaxHighlight(endpoint.postBodyData) : ' '}}></pre></div> : <div className={'code-snippet code-snippet-code-text'}>{endpoint.curl}</div>}
                            </div>
                            <div className={'col-md-6 console-res-container'}>
                                <h5 className={'console-output-header'}>{'Response'}</h5>
                                <div className={'code-snippet'}><pre dangerouslySetInnerHTML={{__html: endpoint.apiResponse ? syntaxHighlight(endpoint.apiResponse.body) : ' '}}></pre></div>
                            </div>
                        </div> :
                        <div>
                                <h5 className={'console-output-header'}>{'Response'}</h5>
                                <div className={'code-snippet'}><pre dangerouslySetInnerHTML={{__html: endpoint.apiResponse ? syntaxHighlight(endpoint.apiResponse.body) : ' '}}></pre></div>
                                {/* eslint-enable react/no-danger */}
                        </div>
                        }
                    <div style={{background: 'blue', height: 'auto'}}></div>
                </div>
            </div>
        </div>
    </div>
);

ApiConsole.displayName = 'API Console';
ApiConsole.propTypes = {
    endpoint: React.PropTypes.shape({
        name: React.PropTypes.string.isRequired,
        description: React.PropTypes.string.isRequired,
        curl: React.PropTypes.string.isRequired,
        isAuthenticated: React.PropTypes.bool.isRequired,
        path: React.PropTypes.string.isRequired,
        action: React.PropTypes.string.isRequired,
        queryString: React.PropTypes.objectOf(
            React.PropTypes.shape({
                description: React.PropTypes.string,
                example: React.PropTypes.any,
                required: React.PropTypes.bool,
                value: React.PropTypes.any.isRequired
            })
        ),
        pathParams: React.PropTypes.objectOf(
            React.PropTypes.shape({
                description: React.PropTypes.string,
                example: React.PropTypes.any,
                required: React.PropTypes.bool,
                value: React.PropTypes.any.isRequired
            })
        ),
        postBody: React.PropTypes.object,
        apiResponse: React.PropTypes.shape({
            status: React.PropTypes.string.isRequired,
            statusMessage: React.PropTypes.string.isRequired,
            body: React.PropTypes.oneOfType([
                React.PropTypes.object, React.PropTypes.array
            ]).isRequired
        }),
        apiConsoleVisible: React.PropTypes.bool.isRequired
    }).isRequired,
    id: React.PropTypes.number.isRequired
};

export default ApiConsole;