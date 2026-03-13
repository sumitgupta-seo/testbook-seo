cat > ~/Downloads/testbook - seo / src / app / api / search / route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q');
    const API_KEY = 'AIzaSyCIoEQspj81otGCGTK8nedRY7EeZb6MbFo';
    const CX = '10ff4d719d9834028';

    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(query!)}&num=10`;

    const res = await fetch(url);
    const data = await res.json();

    return NextResponse.json(data);
}
EOF