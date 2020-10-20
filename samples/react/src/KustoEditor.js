import React, { useEffect } from 'react';
import { init } from './monaco-kusto';
import { setSchema } from './schema';

/**
 * a (very) thin react wrapper around monaco.
 * Any real world application will have to inject props (i.e. initial value, ETC)
 */
export const KustoEditor = () => {
    useEffect(() => {
        init().then((monacoInstance) => {
            console.log('initialized');
            const wrapper = document.getElementById('monaco-root');
            const properties = {
                value: 'StormEvents | count',
                language: 'kusto',
            };

            const editor = monacoInstance.editor.create(wrapper, properties);

            setSchema(editor);
        });
    }, []);
    return <div id="monaco-root" className="App" style={{ width: '100%', height: '90vh' }} />;
};
