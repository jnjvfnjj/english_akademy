# English School CRM — Back-End Capstone Application

An enterprise-ready, beautifully architected School Management and billing REST API designed in standard Java 17 and Spring Boot 3.x. This backend showcases clean software architecture, object-oriented design patterns, SOLID principles, high-coverage JUnit testing, and database persistence.

---

## 🏛️ System Architecture

The application implements a classic **4-Tier layered enterprise architecture** that strictly decouples database concerns, service-layer business rules, and public JSON HTTP interfaces.

```
com.school.crm
├── controller         <-- REST Endpoint Declarations (handles HTTP requests & @Valid DTOs)
├── service            <-- Business Logic Interfaces
│   └── impl           <-- Concrete Service Layer implementations (where all business logic resides)
├── repository         <-- Spring Data JPA Repositories (database abstraction queries)
├── model
│   ├── entity         <-- Encapsulated JPA Database Entities
│   └── dto            <-- Data Transfer Objects (Validation boundaries mapping)
├── exception          <-- Global REST Exception handling Advice and Custom Exceptions
└── design             <-- Active OOP Design Pattern Implementations
    ├── strategy       <-- Strategy Pattern (Dynamic Package Tuition calculations)
    ├── builder        <-- Builder Pattern (Polished customized Printable Receipt compiler)
    └── observer       <-- Observer Pattern (Decoupled events and database audit monitors)
```

---

## 📑 Core Domain Entities & Relationships (JPA)

```
       ┌────────────────────────┐
       │        Student         │
       └──────────┬───┬─────────┘
                  │   │
        One-to-Many   One-to-Many (Orphan Removal, Cascade.ALL)
                  │   │
                  ▼   ▼
     ┌──────────────┐┌──────────────────┐
     │    Lesson    ││   Transaction    │
     └──────────────┘└──────────────────┘
```

1. **Student Entity**: Represents student registers. Declares `@OneToMany` cascade associations to `Lessons` and `Transactions`.
2. **Lesson Entity**: Defines scheduled lessons with teacher names, student mapping, times, and lifecycle states (`Scheduled`, `Completed`, `Cancelled`).
3. **Transaction Entity**: Handles double-entry school accounting. Can reflect Student Tuitions (**Income**) or operating Rent/Teacher Salaries (**Expenses**).
4. **AuditLog Entity**: Central logging schema tracking mission-critical student hours modifications and state exceptions.

---

## 🎨 Implemented Design Patterns (Rubric Mastery)

This capstone project implements **three distinct GoF Design Patterns** to enforce loose coupling and maintainable extensions.

### 1. Strategy Pattern (Behavioral)
* **Rationale**: Tuition package prices dynamically pivot based on the student's selected pack tier (standard rate vs bulk discount vs VIP packages). Putting these switch cases directly in service layers creates rigid, un-extendable code.
* **Implementation**:
  * `PricingStrategy` (interface): Declares `calculatePrice(int hours)`.
  * `RegularPricingStrategy`: Computes standard billing rate ($25.0/hour).
  * `PackagePricingStrategy`: Applies a custom bulk package purchase 10% discount ($22.5/hour).
  * `VipGoldPricingStrategy`: Applies a premium VIP Gold tier 20% discount ($20.0/hour).
  * `PricingContext`: Orchestrates strategy context execution.

### 2. Builder Pattern (Creational)
* **Rationale**: Logging financial packages generates long printable invoices or receipts with many fields. Using standard constructors leads to telescoping parameter antimodes, which decreases readability and increases bug frequencies.
* **Implementation**:
  * `Receipt`: Features private constructors and can only be build dynamically by the static inner class `Receipt.ReceiptBuilder`. It generates standardized legal school printable receipts.

### 3. Observer Pattern (Behavioral)
* **Rationale**: Important states modification (such as hourly balance drop warnings or schedule cancellation events) require instant audit tracking and trigger automatic warnings. Coupling these directly inside services violates the **Single Responsibility Principle (SRP)**.
* **Implementation**:
  * Spring Boot application event system acts as the core event dispatcher.
  * When student balances fluctuate, `StudentBalanceEvent` gets published.
  * `SchoolEventListener` observes these events polymorphicly, records entries in the `AuditLog` table, and automatically triggers system warnings if hours drop below the threshold (≤ 3 hours).

---

## ⚙️ Non-Trivial Complex Business Functions

1. **Lesson Lifecycle Integration**:
   * Scheduling states are tracked actively. When a student's scheduled lesson is patched to `Completed` status, the application automatically triggers database queries to **deduct 1 hour** from their balance and increments `totalClasses` completed. 
   * If a completed lesson transitions into `Cancelled` status, their credit balance package hour is automatically restored.
2. **Tuition Payment and Refills**:
   * Creating an income transaction of category `Tuition` with matching `pricingTier` automatically selects the correct OOP Strategy, calculates final financial amounts, adds physical hours to the student's profile, and prints a formatted receipt via the custom Builder pattern.

---

## 🛡️ Best-Practice SOLID Code Quality Rules

* **Constructor-Based Dependency Injection**: In accordance with modern architectural guidelines, no field injections with `@Autowired` are used. All controllers and services utilize constructor parameters for dependencies, facilitating easy mock-testing.
* **Encapsulation Protection**: All fields are private. Model entities are never returned directly by Controller endpoints; separate `@Valid` DTO schemas are mapped manually inside the service layer.
* **Input Validation**: Hard input constraints are enforced globally using standard Bean validation annotations (`@NotBlank`, `@Min`, `@DecimalMax`, `@Email`, `@Pattern`).
* **Global Error Advice**: The `@RestControllerAdvice` class intercepts all validations, state conflicts, and resource-missing boundaries and maps them to unified JSON error payloads (`ErrorResponse`).

---

## 🧪 Unit Testing Setup (JUnit 5 + Mockito)

All service classes feature rich test coverage Mockito mocks.
Mockito mockmakers are configured under subclass mode to ensure seamless operation on sandboxed Java 21 containers without dynamic native attachments.

Run tests using:
```bash
gradle test
```

---

## 🚀 Быстрый запуск и публикация (Quick Start & Publication)

Клиент на **React Native / Expo** поддерживает web, Android и iOS. После входа через общий Java REST API реестр студентов загружается из сервера и синхронизируется между устройствами. Удаление студента записывается сервером; панель администратора проверяет уведомления об удалениях каждые пять секунд. Экран «СУБД» показывает данные приложения, но не является SQL-клиентом.

При локальном запуске API сохраняет данные в файловую H2. Для общей PostgreSQL задайте backend-переменные `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD` или стандартные `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, а также `ADMIN_EMAIL` и `ADMIN_PASSWORD` (не менее 12 символов). Для `SPRING_DATASOURCE_URL` используйте JDBC URL вида `jdbc:postgresql://host:5432/database?sslmode=require`. Драйвер PostgreSQL уже включён, а Hibernate определяет диалект по JDBC metadata, поэтому приложение должно иметь непустой URL и доступ к базе во время запуска; задавать диалект вручную обычно не требуется. При первом запуске API эти данные создают главного администратора. Его пароль не хранится в исходном коде. Также главного администратора можно создать вручную из интерактивного терминала, используя ту же базу данных:

```powershell
.\gradlew.bat bootJar
if ($LASTEXITCODE -ne 0) { throw "Сборка завершилась ошибкой; JAR не запускается." }
java -jar "$env:TEMP\english-school-crm-build\libs\english-school-crm-0.0.1-SNAPSHOT.jar" --create-admin
```

Программа запросит email, имя и пароль; пароль вводится скрыто, затем нужно повторить его. Для общей базы перед запуском задайте переменные подключения `DATABASE_URL`, `DATABASE_USER` и `DATABASE_PASSWORD` (или соответствующие `SPRING_DATASOURCE_*`). Главный администратор создаёт дополнительные учётные записи администраторов во вкладке «Админы»; обычные администраторы не могут создавать новых через эту вкладку. Финансовые REST-маршруты и экран управления базой доступны администраторам; преподаватели не видят финансовые суммы и не могут изменять операции через API.

Чтобы включить регистрацию администратора на экране входа, задайте серверную переменную `ADMIN_REGISTRATION_CODE` длиной от 16 до 256 символов и перезапустите API. Код запрашивается в форме регистрации администратора и не должен задаваться через `EXPO_PUBLIC_*` или храниться в исходном коде. Любой, кто знает этот код, сможет зарегистрировать административный аккаунт.

Для локального запуска API используйте `gradlew.bat bootRun`, а в другом терминале — `npm start`. В локальной разработке клиент использует `http://localhost:8080/api`, если `EXPO_PUBLIC_API_URL` не задан. Для телефона задайте адрес компьютера в локальной сети, а для опубликованного сайта — публичный HTTPS-адрес API.

### Развёртывание API на Render

Корневой `render.yaml` описывает бесплатный Docker Web Service `english-akademy-api` с проверкой `/api/health`. В Render создайте Blueprint из GitHub-репозитория и заполните запрошенные секретные переменные:

- `SPRING_DATASOURCE_URL` — JDBC URL существующей PostgreSQL, например `jdbc:postgresql://host:5432/database?sslmode=require`.
- `SPRING_DATASOURCE_USERNAME` и `SPRING_DATASOURCE_PASSWORD` — реквизиты этой базы.
- `ADMIN_EMAIL` и `ADMIN_PASSWORD` — email главного администратора и пароль длиной не менее 12 символов.

Значения базы берите у её провайдера; используйте **direct JDBC URL**, начинающийся с `jdbc:postgresql://`, а не URL панели или сайта. Секреты не добавляйте в Git, `render.yaml` или настройки Vercel. Приложение автоматически создаёт главного администратора при первом запуске с пустой базой. Если в базе уже есть главный администратор, текущая учётная запись сохраняется.

После успешного деплоя проверьте `https://<имя-сервиса>.onrender.com/api/health`: ожидается JSON `{"status":"UP"}`. Затем в Vercel откройте **Project → Settings → Environment Variables**, установите `EXPO_PUBLIC_API_URL` равным `https://<имя-сервиса>.onrender.com/api` для Production (и Preview при необходимости) и заново соберите/разверните frontend. URL сервиса можно скопировать из Render Dashboard.

**Ограничения бесплатного тарифа:** Render останавливает бесплатный Web Service после простоя, поэтому первый запрос после сна может выполняться медленно. Данные приложения должны находиться во внешней PostgreSQL: файловая система бесплатного сервиса эфемерная и не подходит для хранения данных. Для постоянно работающего API потребуется платный тариф Web Service. Не используйте H2 для опубликованного сервиса.

`render.yaml` использует существующий `Dockerfile`, который на Render слушает `PORT` (по умолчанию `10000`); локально API по-прежнему работает на `8080`. Для Fly.io конфигурация остаётся в `fly.toml`.

На экране входа можно выбрать «Преподаватель» или «Администратор»; после входа преподаватель видит свой профиль с именем и email. Администратор видит список преподавателей и может отключить или восстановить их учётные записи. Отключение отзывает активные сессии, но сохраняет аккаунт и историю. Расписание в профиле пока не показывается: расписание групп хранится на клиенте и ещё не связано с аккаунтами преподавателей на сервере.

При первом входе, если API ещё пуст, клиент переносит туда имеющиеся локальные записи студентов. Проверьте их перед подключением базы с реальными данными. Не задавайте административный пароль в коде или во frontend-переменных окружения.

Для проверки браузерных сценариев установите Chromium командой `npx playwright install chromium`, затем запустите `npm run test:e2e`. Сценарии проверяют переключение роли, профиль преподавателя и управление доступом администратора.

---

### 💻 Локальный запуск на компьютере (Local Setup)

1. **Установите зависимости**:
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Скомпилируйте фронтенд**:
   ```bash
   npm run build
   ```

3. **Запустите Full-Stack сервер**:
   ```bash
   npm start
   ```
   Приложение автоматически запустится на порту `3000`. Вы можете открыть в браузере: **`http://localhost:3000/`**.

---

### ⚙️ Авто-диагностика на сервере

Если вы запустите сервер до того, как скомпилировали фронтенд (`node server.js`), встроенный умный диагностический обработчик:
1. Автоматически запустит фоновую компиляцию фронтенда (`npm run build`).
2. Покажет красивую графическую панель статуса сборки в браузере в реальном времени.
3. Автоматически перезагрузит страницу и откроет рабочий кабинет CRM школы, как только бандл будет готов!

---

### 🏛️ Описание функционала для демонстрации:
* **Кабинет Студентов**: Добавление профилей, поиск, фильтр по возрастам и уровням, корректировка балансов уроков.
* **Кабинет Расписания**: Календарь занятий с изменением статуса («Запланировано», «Завершено», «Отменено»). При завершении занятия с баланса студента автоматически списывается час и начисляется в историю.
* **Кабинет Финансов (Биллинг)**: Просмотр доходов (Оплаты за обучение) и расходов (Аренда, Зарплаты), создание транзакций, авто-расчет стоимости по выбранной скидочной OOP Стратегии.
* **СУБД Панель**: Наглядное табличное представление базы данных с возможностью очистки таблиц, сброса к эталонным тестовым записям и прямого контроля состояния.

---

## 📂 Deliverables and Documentation
* **PlantUML Class Diagram**: Located under `/docs/class-diagram.puml`
* **JSON Postman Collection**: Full REST collection available at `/docs/english-school-crm.postman_collection.json`

---

## 🤖 AI Use Statement (Academic Integrity Disclosure)

In accordance with Section 12 (**Academic Integrity & AI Use**) of the E|C College Capstone Project guidelines, this section discloses the use of generative AI tools in this project:

* **AI Tools Utilized**: Google AI Studio Code Editor and Gemini Models.
* **How They Were Used**:
  * **Explaining Concepts**: Assisting with JUnit 5 Mockito configurations for Java 17 and Spring Boot 3.3.
  * **Templates & Boilerplate**: Generating standard JPA entity field annotations, basic CRUD repository templates, DTO constructors, and lombok/getters standard boilerplate.
  * **Refactoring and Optimization**: Formatting design pattern structural layouts (e.g., separating the Nested Builder pattern for printable receipts and isolating the behavioral Strategy interface pattern). Let's certify that all business rules, event publishers, database transitions, and actual design pattern details were fully analyzed, refined, and verified by the student. No code was included without complete understanding of its behavior and design justification.
