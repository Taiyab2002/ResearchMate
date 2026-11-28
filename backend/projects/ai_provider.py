"""Optional OpenAI-compatible chat-completions provider for ResearchMate."""
import json
import os
import urllib.error
import urllib.request


class AIProviderError(Exception):
    """Safe provider error suitable for returning to an API client."""


def is_configured():
    return bool(os.environ.get('AI_API_KEY', '').strip())


def chat(prompt, system="You are ResearchMate, a careful academic research assistant."):
    api_key = os.environ.get('AI_API_KEY', '').strip()
    if not api_key:
        raise AIProviderError('AI provider is not configured. Set AI_API_KEY and AI_MODEL.')
    endpoint = os.environ.get('AI_API_BASE_URL', 'https://api.openai.com/v1/chat/completions').strip()
    model = os.environ.get('AI_MODEL', '').strip()
    if not model:
        raise AIProviderError('AI_MODEL is not configured.')
    payload = {
        'model': model,
        'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}],
        'temperature': 0.3,
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
        method='POST',
    )
    timeout = int(os.environ.get('AI_REQUEST_TIMEOUT', '45'))
    try:
        with urllib.request.urlopen(request, timeout=max(5, min(timeout, 120))) as response:
            result = json.loads(response.read().decode('utf-8'))
        content = result['choices'][0]['message']['content']
        if isinstance(content, list):
            content = ''.join(part.get('text', '') for part in content if isinstance(part, dict))
        content = str(content).strip()
        if not content:
            raise AIProviderError('AI provider returned an empty response.')
        return content
    except AIProviderError:
        raise
    except urllib.error.HTTPError as exc:
        # Never expose provider response bodies, which may contain sensitive details.
        if exc.code in (401, 403):
            raise AIProviderError('AI provider authentication failed. Check AI_API_KEY.') from None
        if exc.code == 429:
            raise AIProviderError('AI provider rate limit or quota reached.') from None
        raise AIProviderError(f'AI provider returned HTTP {exc.code}.') from None
    except (urllib.error.URLError, TimeoutError):
        raise AIProviderError('Could not connect to the AI provider; check network and endpoint settings.') from None
    except (KeyError, IndexError, TypeError, ValueError):
        raise AIProviderError('AI provider response was not in the expected chat-completions format.') from None
