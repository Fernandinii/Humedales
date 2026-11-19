from app.schemas.humedal import (
    HumedalResponse,
    ContenedorResponse,
    NodoResponse,
    LecturaResponse,
    IngestaRequest,
    IngestaResponse,
    HumedalCreate,
    HumedalUpdate,
    ContenedorCreate,
    ContenedorUpdate,
    NodoCreate,
    NodoUpdate,
)
from app.schemas.sistema import (
    RolResponse,
    UsuarioResponse,
    UsuarioCreate,
    UsuarioUpdate,
    ParametroResponse,
    ParametroUpdate,
    DetalleLecturaResponse,
    AlertaResponse,
    AlertaUpdate,
    DashboardResumenResponse,
)
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.sensor import (
    SensorResponse,
    SensorParametroResponse,
    SensorCreate,
    SensorUpdate,
    SensorParametroCreate,
    SensorParametroUpdate,
)
from app.schemas.ml import ModeloMLResponse, PrediccionLecturaResponse
from app.schemas.infraestructura import (
    ConexionContenedorResponse,
    DispositivoUsuarioResponse,
)
