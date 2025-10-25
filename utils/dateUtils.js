const moment = require('moment');

class DateUtils {
  // Get current timestamp
  now() {
    return new Date();
  }

  // Get current ISO string
  nowISO() {
    return new Date().toISOString();
  }

  // Get current Unix timestamp
  nowUnix() {
    return Math.floor(Date.now() / 1000);
  }

  // Format date
  format(date, format = 'YYYY-MM-DD HH:mm:ss') {
    return moment(date).format(format);
  }

  // Format date for display
  formatForDisplay(date, includeTime = true) {
    const format = includeTime ? 'MMM DD, YYYY [at] h:mm A' : 'MMM DD, YYYY';
    return moment(date).format(format);
  }

  // Format relative time (e.g., "2 hours ago")
  formatRelative(date) {
    return moment(date).fromNow();
  }

  // Check if date is valid
  isValidDate(date) {
    return moment(date).isValid();
  }

  // Parse date string
  parseDate(dateString, format) {
    if (format) {
      return moment(dateString, format).toDate();
    }
    return moment(dateString).toDate();
  }

  // Add time to date
  addTime(date, amount, unit = 'days') {
    return moment(date).add(amount, unit).toDate();
  }

  // Subtract time from date
  subtractTime(date, amount, unit = 'days') {
    return moment(date).subtract(amount, unit).toDate();
  }

  // Get start of day
  startOfDay(date = new Date()) {
    return moment(date).startOf('day').toDate();
  }

  // Get end of day
  endOfDay(date = new Date()) {
    return moment(date).endOf('day').toDate();
  }

  // Get start of week
  startOfWeek(date = new Date()) {
    return moment(date).startOf('week').toDate();
  }

  // Get end of week
  endOfWeek(date = new Date()) {
    return moment(date).endOf('week').toDate();
  }

  // Get start of month
  startOfMonth(date = new Date()) {
    return moment(date).startOf('month').toDate();
  }

  // Get end of month
  endOfMonth(date = new Date()) {
    return moment(date).endOf('month').toDate();
  }

  // Get start of year
  startOfYear(date = new Date()) {
    return moment(date).startOf('year').toDate();
  }

  // Get end of year
  endOfYear(date = new Date()) {
    return moment(date).endOf('year').toDate();
  }

  // Check if date is in the past
  isPast(date) {
    return moment(date).isBefore(moment());
  }

  // Check if date is in the future
  isFuture(date) {
    return moment(date).isAfter(moment());
  }

  // Check if date is today
  isToday(date) {
    return moment(date).isSame(moment(), 'day');
  }

  // Check if date is yesterday
  isYesterday(date) {
    return moment(date).isSame(moment().subtract(1, 'day'), 'day');
  }

  // Check if date is tomorrow
  isTomorrow(date) {
    return moment(date).isSame(moment().add(1, 'day'), 'day');
  }

  // Check if date is this week
  isThisWeek(date) {
    return moment(date).isSame(moment(), 'week');
  }

  // Check if date is this month
  isThisMonth(date) {
    return moment(date).isSame(moment(), 'month');
  }

  // Check if date is this year
  isThisYear(date) {
    return moment(date).isSame(moment(), 'year');
  }

  // Get difference between dates
  getDifference(date1, date2, unit = 'days') {
    return moment(date1).diff(moment(date2), unit);
  }

  // Get duration between dates
  getDuration(date1, date2) {
    const duration = moment.duration(moment(date1).diff(moment(date2)));
    return {
      years: duration.years(),
      months: duration.months(),
      days: duration.days(),
      hours: duration.hours(),
      minutes: duration.minutes(),
      seconds: duration.seconds(),
      humanize: duration.humanize()
    };
  }

  // Check if date is between two dates
  isBetween(date, startDate, endDate, inclusive = true) {
    const inclusivity = inclusive ? '[]' : '()';
    return moment(date).isBetween(startDate, endDate, null, inclusivity);
  }

  // Get age from birth date
  getAge(birthDate) {
    return moment().diff(moment(birthDate), 'years');
  }

  // Get timezone offset
  getTimezoneOffset() {
    return moment().utcOffset();
  }

  // Convert to timezone
  toTimezone(date, timezone) {
    return moment(date).tz(timezone).toDate();
  }

  // Convert to UTC
  toUTC(date) {
    return moment(date).utc().toDate();
  }

  // Get business days between dates
  getBusinessDays(startDate, endDate) {
    let count = 0;
    const current = moment(startDate);
    const end = moment(endDate);

    while (current.isSameOrBefore(end)) {
      if (current.day() !== 0 && current.day() !== 6) { // Not Sunday or Saturday
        count++;
      }
      current.add(1, 'day');
    }

    return count;
  }

  // Check if date is a weekend
  isWeekend(date) {
    const day = moment(date).day();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  // Check if date is a weekday
  isWeekday(date) {
    return !this.isWeekend(date);
  }

  // Get next business day
  getNextBusinessDay(date = new Date()) {
    let next = moment(date).add(1, 'day');
    
    while (this.isWeekend(next.toDate())) {
      next = next.add(1, 'day');
    }
    
    return next.toDate();
  }

  // Get previous business day
  getPreviousBusinessDay(date = new Date()) {
    let prev = moment(date).subtract(1, 'day');
    
    while (this.isWeekend(prev.toDate())) {
      prev = prev.subtract(1, 'day');
    }
    
    return prev.toDate();
  }

  // Get quarter from date
  getQuarter(date = new Date()) {
    return moment(date).quarter();
  }

  // Get week number
  getWeekNumber(date = new Date()) {
    return moment(date).week();
  }

  // Get day of year
  getDayOfYear(date = new Date()) {
    return moment(date).dayOfYear();
  }

  // Create date range
  createDateRange(startDate, endDate, step = 1, unit = 'days') {
    const dates = [];
    const current = moment(startDate);
    const end = moment(endDate);

    while (current.isSameOrBefore(end)) {
      dates.push(current.toDate());
      current.add(step, unit);
    }

    return dates;
  }

  // Format for database storage
  formatForDB(date = new Date()) {
    return moment(date).utc().format('YYYY-MM-DD HH:mm:ss');
  }

  // Format for API response
  formatForAPI(date = new Date()) {
    return moment(date).toISOString();
  }

  // Parse from database
  parseFromDB(dateString) {
    return moment.utc(dateString).toDate();
  }

  // Get time ago in words
  getTimeAgo(date) {
    const now = moment();
    const then = moment(date);
    const diff = now.diff(then);

    if (diff < 60000) { // Less than 1 minute
      return 'just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diff < 604800000) { // Less than 1 week
      const days = Math.floor(diff / 86400000);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return then.format('MMM DD, YYYY');
    }
  }

  // Get analytics date ranges
  getAnalyticsDateRanges() {
    const now = moment();
    
    return {
      today: {
        start: this.startOfDay(),
        end: this.endOfDay()
      },
      yesterday: {
        start: this.startOfDay(now.clone().subtract(1, 'day').toDate()),
        end: this.endOfDay(now.clone().subtract(1, 'day').toDate())
      },
      thisWeek: {
        start: this.startOfWeek(),
        end: this.endOfWeek()
      },
      lastWeek: {
        start: this.startOfWeek(now.clone().subtract(1, 'week').toDate()),
        end: this.endOfWeek(now.clone().subtract(1, 'week').toDate())
      },
      thisMonth: {
        start: this.startOfMonth(),
        end: this.endOfMonth()
      },
      lastMonth: {
        start: this.startOfMonth(now.clone().subtract(1, 'month').toDate()),
        end: this.endOfMonth(now.clone().subtract(1, 'month').toDate())
      },
      thisYear: {
        start: this.startOfYear(),
        end: this.endOfYear()
      },
      last30Days: {
        start: now.clone().subtract(30, 'days').startOf('day').toDate(),
        end: this.endOfDay()
      },
      last90Days: {
        start: now.clone().subtract(90, 'days').startOf('day').toDate(),
        end: this.endOfDay()
      }
    };
  }
}

module.exports = new DateUtils();