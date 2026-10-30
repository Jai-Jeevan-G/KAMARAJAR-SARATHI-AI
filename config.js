/* Optional settings. Leave aiEndpoint empty to use the built-in offline helper.
   To connect a live AI, run a small server that holds your API key and set its URL here, e.g.
   window.KS_CONFIG = { aiEndpoint: 'https://your-server.example/api/guardian' };
   Contract: POST { question, history:[{role,content}], context:{class,subjects} } -> { reply: "text" }.
   Never put an API key in this file. It is public. */
window.KS_CONFIG = { aiEndpoint: '' };
