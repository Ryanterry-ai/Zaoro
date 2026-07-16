/**
 * FastAPIRenderer — translates ComponentSpecs into Python/FastAPI backend code.
 *
 * Generates a complete FastAPI application with:
 *   - Pydantic models for each entity
 *   - CRUD routes with MongoDB (motor async driver)
 *   - JWT authentication (python-jose + passlib)
 *   - CORS middleware, health checks, Dockerfile
 *
 * Usage:
 *   import { FastAPIRenderer } from './fastapi-renderer.js';
 *   registerRenderer(new FastAPIRenderer());
 */

import type {
  ComponentSpec,
  PageSpec,
  ApplicationSpec,
} from '../../bos/schemas/blueprint/execution-blueprint.schema.js';
import type {
  Renderer,
  RenderContext,
  RenderedFile,
  RenderResult,
} from './renderer.js';
import { stageLogger } from '../../core/debug-logger.js';

const log = stageLogger('render');

/** Python type mapping from component field types. */
const PYTHON_TYPE_MAP: Record<string, string> = {
  text: 'str',
  email: 'str',
  password: 'str',
  number: 'int',
  date: 'datetime',
  select: 'str',
  textarea: 'str',
  checkbox: 'bool',
  radio: 'str',
  url: 'str',
  image: 'str',
  boolean: 'bool',
  html: 'str',
  markdown: 'str',
};

/** Entity names derived from component types for model generation. */
const ENTITY_COMPONENT_TYPES = new Set([
  'DataTable',
  'CrudTable',
  'ListPage',
  'DetailPage',
  'FormSection',
  'AdminPanel',
]);

export class FastAPIRenderer implements Renderer {
  readonly platform = 'fastapi';
  readonly componentExtension = '.py';
  readonly pageExtension = '.py';

  renderComponent(spec: ComponentSpec, _context: RenderContext): RenderedFile {
    log.debug('Rendering FastAPI component', { type: spec.type });
    const code = this.generateModelCode(spec);
    return {
      path: `models/${this.toSnakeCase(spec.type)}.py`,
      content: code,
      type: 'component',
    };
  }

  renderPage(spec: PageSpec, _context: RenderContext): RenderedFile[] {
    const files: RenderedFile[] = [];
    const routeName = this.toSnakeCase(spec.name);
    const routeCode = this.generateRouteCode(spec);

    files.push({
      path: `routes/${routeName}.py`,
      content: routeCode,
      type: 'route',
    });

    return files;
  }

  renderApplication(spec: ApplicationSpec, context: RenderContext): RenderResult {
    log.info('Rendering FastAPI application', {
      pages: spec.pages.length,
      appName: spec.appName,
    });

    const t = Date.now();
    const files: RenderedFile[] = [];
    const warnings: string[] = [];

    const entities = this.extractEntities(spec);

    // Generate Pydantic models for each entity
    for (const entity of entities) {
      files.push(this.renderComponent(entity.spec, context));
    }

    // Generate CRUD routes for each entity
    for (const entity of entities) {
      files.push(...this.renderPage(entity.page, context));
    }

    // Generate infrastructure files
    files.push(this.renderMainPy(spec, context));
    files.push(this.renderDatabasePy(spec));
    files.push(this.renderAuthModule(spec));
    files.push(this.renderAuthRoutes(spec));
    files.push(this.renderRequirementsTxt());
    files.push(this.renderDockerfile());
    files.push(this.renderHealthCheck());

    log.info('FastAPI application rendered', {
      files: files.length,
      entities: entities.length,
      duration: Date.now() - t,
    });

    return { files, warnings };
  }

  renderLayout(spec: ApplicationSpec, context: RenderContext): RenderedFile[] {
    return [
      this.renderMainPy(spec, context),
      this.renderDatabasePy(spec),
      this.renderRequirementsTxt(),
      this.renderDockerfile(),
    ];
  }

  // ─── Entity Extraction ───────────────────────────────────────────────────

  private extractEntities(
    spec: ApplicationSpec,
  ): Array<{ name: string; spec: ComponentSpec; page: PageSpec }> {
    const entities: Array<{ name: string; spec: ComponentSpec; page: PageSpec }> = [];
    const seen = new Set<string>();

    for (const page of spec.pages) {
      for (const component of page.components) {
        const entityName = this.inferEntityName(component, page);
        if (entityName && !seen.has(entityName)) {
          seen.add(entityName);
          entities.push({ name: entityName, spec: component, page });
        }
      }
    }

    // If no entities were inferred from components, create one from the app name
    if (entities.length === 0) {
      const appName = this.toPascalCase(spec.appName);
      entities.push({
        name: appName,
        spec: { type: appName, content: {} },
        page: spec.pages[0] ?? {
          pageId: 'home',
          path: '/',
          name: 'Home',
          type: 'page',
          layout: 'full-width',
          components: [],
        },
      });
    }

    return entities;
  }

  private inferEntityName(component: ComponentSpec, page: PageSpec): string | undefined {
    // Explicit entity from metadata
    const metaEntity = component.metadata?.['entity'];
    if (typeof metaEntity === 'string' && metaEntity.length > 0) {
      return this.toPascalCase(metaEntity);
    }

    // Infer from component type if it represents a data entity
    if (ENTITY_COMPONENT_TYPES.has(component.type)) {
      const pageName = this.toPascalCase(page.name);
      return pageName.length > 0 ? pageName : undefined;
    }

    // Infer from page name for list/detail pages
    if (page.type === 'list' || page.type === 'detail' || page.type === 'admin') {
      return this.toPascalCase(page.name);
    }

    return undefined;
  }

  // ─── main.py ─────────────────────────────────────────────────────────────

  private renderMainPy(spec: ApplicationSpec, _context: RenderContext): RenderedFile {
    const appName = this.toSnakeCase(spec.appName || 'app');
    const entities = this.extractEntities(spec);

    const routerImports = entities
      .map(e => `from routes.${this.toSnakeCase(e.name)} import router as ${this.toSnakeCase(e.name)}_router`)
      .join('\n');

    const routerInclusions = entities
      .map(e => `app.include_router(${this.toSnakeCase(e.name)}_router, prefix="/api/v1/${this.toSnakeCase(e.name)}s", tags=["${this.toSnakeCase(e.name)}s"])`)
      .join('\n');

    const content = `"""
${spec.appName} — FastAPI Backend
Generated by Build Engine
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import connect_to_mongo, close_mongo_connection
from auth.routes import router as auth_router
${routerImports}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title="${spec.appName}",
    description="Generated FastAPI backend for ${spec.appName}",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1/auth", tags=["authentication"])
${routerInclusions}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "${spec.appName}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
`;

    return {
      path: 'main.py',
      content,
      type: 'layout',
    };
  }

  // ─── database.py ─────────────────────────────────────────────────────────

  private renderDatabasePy(spec: ApplicationSpec): RenderedFile {
    const dbName = this.toSnakeCase(spec.appName || 'app').replace(/_/g, '');

    const content = `"""
MongoDB async connection via motor.
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME: str = os.getenv("DATABASE_NAME", "${dbName}")

client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    global client, db
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DATABASE_NAME]
    await db.command("ping")


async def close_mongo_connection() -> None:
    global client
    if client is not None:
        client.close()


def get_database() -> AsyncIOMotorDatabase:
    if db is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongo() first.")
    return db
`;

    return {
      path: 'database.py',
      content,
      type: 'config',
    };
  }

  // ─── auth/ ───────────────────────────────────────────────────────────────

  private renderAuthModule(spec: ApplicationSpec): RenderedFile {
    const content = `"""
JWT Authentication — token creation, verification, and password hashing.
"""

import os
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY: str = os.getenv("SECRET_KEY", "${this.generateSecretKey()}")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict[str, str], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict[str, str]:
    return decode_access_token(token)
`;

    return {
      path: 'auth/__init__.py',
      content,
      type: 'config',
    };
  }

  private renderAuthRoutes(spec: ApplicationSpec): RenderedFile {
    const content = `"""
Authentication routes — register and login.
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_database
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest) -> TokenResponse:
    database: AsyncIOMotorDatabase = get_database()
    existing = await database.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user_doc = {
        "email": request.email,
        "hashed_password": hash_password(request.password),
        "full_name": request.full_name,
    }
    result = await database.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    access_token = create_access_token(
        data={"sub": user_id, "email": request.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(
        access_token=access_token,
        user_id=user_id,
        email=request.email,
    )


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> TokenResponse:
    database: AsyncIOMotorDatabase = get_database()
    user = await database.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, str(user["hashed_password"])):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = str(user["_id"])
    access_token = create_access_token(
        data={"sub": user_id, "email": str(user["email"])},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(
        access_token=access_token,
        user_id=user_id,
        email=str(user["email"]),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict[str, str] = Depends(get_current_user)) -> UserResponse:
    database: AsyncIOMotorDatabase = get_database()
    from bson import ObjectId
    user = await database.users.find_one({"_id": ObjectId(current_user["sub"])})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return UserResponse(
        id=str(user["_id"]),
        email=str(user["email"]),
        full_name=str(user.get("full_name", "")),
    )
`;

    return {
      path: 'auth/routes.py',
      content,
      type: 'route',
    };
  }

  // ─── Model Generation ────────────────────────────────────────────────────

  private generateModelCode(spec: ComponentSpec): string {
    const entityName = this.toPascalCase(spec.type);
    const fields = this.extractModelFields(spec);

    const fieldDefs = fields
      .map(f => `    ${this.toSnakeCase(f.name)}: ${f.pythonType}`)
      .join('\n');

    const createFields = fields
      .filter(f => f.name !== 'id')
      .map(f => {
        const optSuffix = f.optional ? ' = None' : '';
        return `    ${this.toSnakeCase(f.name)}: ${f.pythonType}${optSuffix}`;
      })
      .join('\n');

    return `"""
Pydantic models for ${entityName}.
"""

from datetime import datetime
from pydantic import BaseModel, Field


class ${entityName}Base(BaseModel):
${fieldDefs}


class ${entityName}Create(BaseModel):
${createFields}


class ${entityName}Update(BaseModel):
${fields.filter(f => f.name !== 'id').map(f => {
  const optType = f.optional ? f.pythonType : `${f.pythonType} | None`;
  return `    ${this.toSnakeCase(f.name)}: ${optType} = None`;
}).join('\n')}


class ${entityName}(${entityName}Base):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True
`;
  }

  private extractModelFields(
    spec: ComponentSpec,
  ): Array<{ name: string; pythonType: string; optional: boolean }> {
    const fields: Array<{ name: string; pythonType: string; optional: boolean }> = [];

    // Always include an id field
    fields.push({ name: 'id', pythonType: 'str', optional: false });

    // Extract fields from FormFieldSpec
    if (spec.fields) {
      for (const field of spec.fields) {
        fields.push({
          name: field.name,
          pythonType: PYTHON_TYPE_MAP[field.type] ?? 'str',
          optional: !field.required,
        });
      }
    }

    // Extract fields from content map
    if (spec.content) {
      for (const [key, val] of Object.entries(spec.content)) {
        if (key === 'id') continue;
        const exists = fields.some(f => f.name === key);
        if (!exists) {
          fields.push({
            name: key,
            pythonType: PYTHON_TYPE_MAP[(val as { type: string }).type] ?? 'str',
            optional: false,
          });
        }
      }
    }

    // Extract fields from columns (DataTable)
    if (spec.columns) {
      for (const col of spec.columns) {
        if (col.key === 'id') continue;
        const exists = fields.some(f => f.name === col.key);
        if (!exists) {
          const pyType = col.type === 'number' ? 'int'
            : col.type === 'date' ? 'datetime'
            : col.type === 'boolean' ? 'bool'
            : 'str';
          fields.push({
            name: col.key,
            pythonType: pyType,
            optional: true,
          });
        }
      }
    }

    // Add created_at / updated_at for entities
    if (fields.length > 1) {
      fields.push({ name: 'created_at', pythonType: 'datetime', optional: true });
      fields.push({ name: 'updated_at', pythonType: 'datetime', optional: true });
    }

    return fields;
  }

  // ─── Route Generation ────────────────────────────────────────────────────

  private generateRouteCode(spec: PageSpec): string {
    const entityName = this.toPascalCase(spec.name);
    const snakeName = this.toSnakeCase(spec.name);
    const collectionName = this.toSnakeCase(spec.name) + 's';

    // Extract fields from the first component that has columns or fields
    let fields: Array<{ name: string; pythonType: string; optional: boolean }> = [];
    for (const comp of spec.components) {
      const extracted = this.extractModelFields(comp);
      if (extracted.length > 1) {
        fields = extracted;
        break;
      }
    }

    if (fields.length === 0) {
      fields = [
        { name: 'id', pythonType: 'str', optional: false },
        { name: 'name', pythonType: 'str', optional: false },
        { name: 'created_at', pythonType: 'datetime', optional: true },
      ];
    }

    const createFields = fields
      .filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at')
      .map(f => {
        const optSuffix = f.optional ? ' = None' : '';
        return `    ${this.toSnakeCase(f.name)}: ${f.pythonType}${optSuffix}`;
      })
      .join('\n');

    const updateFields = fields
      .filter(f => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at')
      .map(f => {
        const optType = f.optional ? f.pythonType : `${f.pythonType} | None`;
        return `    ${this.toSnakeCase(f.name)}: ${optType} = None`;
      })
      .join('\n');

    const content = `"""
CRUD routes for ${entityName}.
"""

from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from database import get_database
from auth import get_current_user

router = APIRouter()

COLLECTION = "${collectionName}"


class ${entityName}Create(BaseModel):
${createFields}


class ${entityName}Update(BaseModel):
${updateFields}


class ${entityName}Response(BaseModel):
    id: str
    data: dict


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/", response_model=List[${entityName}Response])
async def list_${snakeName}s(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    database: AsyncIOMotorDatabase = Depends(get_database),
    _current_user: dict = Depends(get_current_user),
) -> List[dict]:
    cursor = database[COLLECTION].find().skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [_serialize(doc) for doc in docs]


@router.get("/{item_id}", response_model=${entityName}Response)
async def get_${snakeName}(
    item_id: str,
    database: AsyncIOMotorDatabase = Depends(get_database),
    _current_user: dict = Depends(get_current_user),
) -> dict:
    doc = await database[COLLECTION].find_one({"_id": ObjectId(item_id)})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="${entityName} not found",
        )
    return _serialize(doc)


@router.post("/", response_model=${entityName}Response, status_code=status.HTTP_201_CREATED)
async def create_${snakeName}(
    payload: ${entityName}Create,
    database: AsyncIOMotorDatabase = Depends(get_database),
    _current_user: dict = Depends(get_current_user),
) -> dict:
    doc = payload.model_dump(exclude_unset=True)
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await database[COLLECTION].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.put("/{item_id}", response_model=${entityName}Response)
async def update_${snakeName}(
    item_id: str,
    payload: ${entityName}Update,
    database: AsyncIOMotorDatabase = Depends(get_database),
    _current_user: dict = Depends(get_current_user),
) -> dict:
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await database[COLLECTION].find_one_and_update(
        {"_id": ObjectId(item_id)},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="${entityName} not found",
        )
    return _serialize(result)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_${snakeName}(
    item_id: str,
    database: AsyncIOMotorDatabase = Depends(get_database),
    _current_user: dict = Depends(get_current_user),
) -> None:
    result = await database[COLLECTION].delete_one({"_id": ObjectId(item_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="${entityName} not found",
        )
`;

    return content;
  }

  // ─── Health Check ────────────────────────────────────────────────────────

  private renderHealthCheck(): RenderedFile {
    const content = `"""
Health check endpoint (included in main.py, exported for testing).
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}
`;

    return {
      path: 'routes/health.py',
      content,
      type: 'route',
    };
  }

  // ─── requirements.txt ────────────────────────────────────────────────────

  private renderRequirementsTxt(): RenderedFile {
    const content = `fastapi>=0.115.0,<1.0.0
uvicorn[standard]>=0.30.0,<1.0.0
motor>=3.5.0,<4.0.0
pymongo>=4.7.0,<5.0.0
python-jose[cryptography]>=3.3.0,<4.0.0
passlib[bcrypt]>=1.7.4,<2.0.0
python-multipart>=0.0.9
pydantic>=2.5.0,<3.0.0
`;
    return {
      path: 'requirements.txt',
      content,
      type: 'config',
    };
  }

  // ─── Dockerfile ──────────────────────────────────────────────────────────

  private renderDockerfile(): RenderedFile {
    const content = `FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`;
    return {
      path: 'Dockerfile',
      content,
      type: 'config',
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_');
  }

  private generateSecretKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
