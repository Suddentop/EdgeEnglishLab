# edgeenglish.net 서버용 CORS 설정 예시

이 폴더는 **edgeenglish.net**에서 `secure-api-proxy.php`를 서비스하는 **서버**에 적용할 CORS 설정 예시입니다.  
(이 저장소에는 실제 PHP 파일이 없으며, 호스팅 서버에만 존재합니다.)

## 근본 원인

- 브라우저는 `http://localhost:3000`(또는 edgeenglish.net)에서 `https://edgeenglish.net/secure-api-proxy.php`로 요청을 보냅니다.
- **서버가 응답에 `Access-Control-Allow-Origin` 등 CORS 헤더를 보내지 않으면** 브라우저가 응답을 차단합니다.
- 따라서 **원인은 서버 설정/코드**이며, 여기서 제공하는 예시를 서버에 반영하면 됩니다.

자세한 설명: [../docs/CORS_AND_API_PROXY.md](../docs/CORS_AND_API_PROXY.md)

## 사용 방법

1. **PHP에서 처리**  
   `secure-api-proxy.php` 파일 **맨 위**(다른 출력/공백 전)에  
   [cors-headers.php](cors-headers.php) 내용을 붙여 넣습니다.

2. **Apache .htaccess**  
   PHP 수정이 어렵다면, `secure-api-proxy.php`와 같은 디렉터리에  
   [.htaccess.example](.htaccess.example) 내용을 참고해 `.htaccess`를 추가하거나 수정합니다.  
   (호스팅이 Apache이고 AllowOverride가 허용된 경우에만 동작합니다.)

적용 후에는 **서버를 수정한 뒤** 브라우저에서 다시 요청해 보면 CORS 오류가 사라져야 합니다.
