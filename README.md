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

При локальном запуске API сохраняет данные в файловую H2. Для общей базы задайте backend-переменные `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_DRIVER=org.postgresql.Driver`, `DATABASE_DIALECT=org.hibernate.dialect.PostgreSQLDialect`, `ADMIN_EMAIL` и `ADMIN_PASSWORD` (не менее 12 символов). Первый администратор создаётся один раз при запуске API. Регистрация из экрана входа создаёт учётную запись преподавателя. Финансовые REST-маршруты и экран управления базой доступны только администратору; преподаватели не видят финансовые суммы и не могут изменять операции через API.

Для локального запуска API используйте `gradlew.bat bootRun`, а в другом терминале — `npm start`. В локальной разработке клиент использует `http://localhost:8080/api`, если `EXPO_PUBLIC_API_URL` не задан. Для телефона задайте адрес компьютера в локальной сети, а для опубликованного сайта — публичный HTTPS-адрес API.

Веб-клиент публикуется из `dist/`; `vercel.json` раздаёт только статику и не запускает Spring API. Поэтому сначала разверните Spring API отдельно (с постоянной PostgreSQL и backend-переменными из этого раздела), затем в Vercel откройте **Project → Settings → Environment Variables**, добавьте `EXPO_PUBLIC_API_URL` со значением `https://<домен-вашего-api>/api` для Production (и Preview, если нужно) и заново запустите deployment. Переменная встраивается в клиент во время сборки; менять её только в браузере недостаточно. Не указывайте `localhost` в Vercel и не используйте H2 для нескольких серверных экземпляров.

При первом входе, если API ещё пуст, клиент переносит туда имеющиеся локальные записи студентов. Проверьте их перед подключением базы с реальными данными. Не задавайте административный пароль в коде или во frontend-переменных окружения.

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
