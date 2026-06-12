import Foundation

extension Date {
    /// Local-time "yyyy-MM-dd" key, same as the web's `todayString()`.
    var dayKey: String {
        Self.dayKeyFormatter.string(from: self)
    }

    private static let dayKeyFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    var isToday: Bool { Calendar.current.isDateInToday(self) }

    var startOfDay: Date { Calendar.current.startOfDay(for: self) }

    var nextDay: Date { Calendar.current.date(byAdding: .day, value: 1, to: self)! }
    var previousDay: Date { Calendar.current.date(byAdding: .day, value: -1, to: self)! }

    /// Monday-start week containing this date (half-open range), mirroring
    /// `getWeekBounds` in the web store.
    var weekRange: Range<Date> {
        var cal = Calendar.current
        cal.firstWeekday = 2 // Monday
        let interval = cal.dateInterval(of: .weekOfYear, for: self)!
        return interval.start ..< interval.end
    }
}
