
import comma from 'comma-it'

export default num => {
  if(!num) {
    return 0
  }
  
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
