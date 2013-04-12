(function() {
  // This is an example of a file with no errors.
  
  var one = 1;
  
  function Car(color) {
   this.color = color; 
  }

  Car.prototype = {
    honk: function() {
      // Beep beep
    }
  };

  return Car;
}());