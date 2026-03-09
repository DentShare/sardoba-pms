# Task: Phase 3 — Min Nights Rules (#18) & Holiday Calendar (#17)

## Plan
- [x] Read existing rates module, entities, DTOs for patterns
- [x] Create min-nights DTOs (create + update)
- [x] Create MinNightsService with CRUD + checkMinNights
- [x] Add min-nights endpoints to rates controller
- [x] Update rates module (entity + service registration)
- [x] Integrate min-nights check into BookingsService.create()
- [x] Create holiday-calendar module directory + holidays-uz.ts
- [x] Create holiday-calendar DTOs (create + update)
- [x] Create HolidayCalendarService with CRUD + getBoostForDate + seedDefaultHolidays
- [x] Create HolidayCalendarController with endpoints
- [x] Create HolidayCalendarModule
- [x] Register HolidayCalendarModule in app.module.ts
- [x] Integrate holiday boost into RatesService price calculation

## Verification
- [x] All files created and properly importing each other
- [x] Module dependency chain is correct (no circular deps)
- [x] Patterns match existing codebase (guards, decorators, swagger, property scoping)

## Review
Phase 3 fully implemented:
- Min Nights Rules: full CRUD at /v1/rates/min-nights-rules, validation integrated into booking creation
- Holiday Calendar: full CRUD at /v1/calendar/holidays, seed endpoint, boost applied during rate calculation
- Holiday boost visible in rate calculation breakdown (holiday_boost_percent field)
