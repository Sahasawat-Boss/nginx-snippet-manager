import { tokenizeConfig } from '../nginxConfig.js';

export default function CodeView({ content }) {
  return (
    <pre>
      <code className="code-lines">
        {tokenizeConfig(content).map((tokens, index) => (
          // Lines have no identity of their own, and the list is only ever re-rendered whole.
          // eslint-disable-next-line react/no-array-index-key
          <span key={index} className="code-line">
            <span className="line-number" aria-hidden="true">
              {index + 1}
            </span>
            <span className="line-text">
              {tokens.map((token, position) => (
                // eslint-disable-next-line react/no-array-index-key
                <span key={position} className={`tok-${token.type}`}>
                  {token.text}
                </span>
              ))}
            </span>
          </span>
        ))}
      </code>
    </pre>
  );
}
